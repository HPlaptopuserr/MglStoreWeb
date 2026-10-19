"use client";
import { useEffect } from "react";
import { SHARED_STORE_API, SHARED_STORE_WAREHOUSE } from "./config";
import { writeBasket } from "./basket-store";
import type { SharedCatalog } from "./types";
export function useBasketHandoff(onRestored: () => void) {
  useEffect(() => {
    if (!window.location.hash.startsWith("#basket=")) return;
    const controller = new AbortController();
    const restore = async () => {
      try {
        const raw: unknown = JSON.parse(
          decodeURIComponent(window.location.hash.slice(8)),
        );
        if (!Array.isArray(raw) || raw.length > 60) return;
        const quantities = new Map<string, number>();
        for (const value of raw) {
          if (!value || typeof value !== "object") return;
          const line = value as { id?: unknown; quantity?: unknown };
          if (
            typeof line.id !== "string" ||
            line.id.length > 100 ||
            typeof line.quantity !== "number" ||
            !Number.isSafeInteger(line.quantity) ||
            line.quantity < 1 ||
            line.quantity > 10000
          )
            return;
          quantities.set(line.id, line.quantity);
        }
        const query = new URLSearchParams({
          warehouseId: SHARED_STORE_WAREHOUSE.id,
          ids: [...quantities.keys()].join(","),
          limit: "60",
        });
        const response = await fetch(
          `${SHARED_STORE_API}/store/mini-apps/shared-store/products?${query}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) return;
        const catalog = (await response.json()) as SharedCatalog;
        if (controller.signal.aborted) return;
        const lines = catalog.products.flatMap((product) => {
          const quantity = Math.min(
            quantities.get(product.id) ?? 0,
            Math.floor(product.stock),
          );
          return product.orderable &&
            product.warehouse?.id === SHARED_STORE_WAREHOUSE.id &&
            quantity > 0
            ? [{ product, quantity }]
            : [];
        });
        if (lines.length) {
          writeBasket(lines);
          onRestored();
        }
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      } catch {
        /* Invalid or unavailable handoffs do not replace the current basket. */
      }
    };
    void restore();
    return () => controller.abort();
  }, [onRestored]);
}
