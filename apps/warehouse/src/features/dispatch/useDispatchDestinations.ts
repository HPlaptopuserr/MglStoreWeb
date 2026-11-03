"use client";
import { useEffect, useState } from "react";
import { dispatchRequest } from "./dispatch-api";
import type { DispatchStore, DispatchAddressSuggestion } from "./types";

function normalizeStore(value: unknown): DispatchStore | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const org =
    item.organization && typeof item.organization === "object"
      ? (item.organization as Record<string, unknown>)
      : {};
  if (
    typeof item.id !== "string" ||
    typeof item.name !== "string" ||
    typeof org.id !== "string" ||
    typeof org.name !== "string" ||
    typeof item.lat !== "number" ||
    !Number.isFinite(item.lat) ||
    typeof item.lng !== "number" ||
    !Number.isFinite(item.lng)
  )
    return null;
  return {
    id: item.id,
    name: item.name,
    lat: item.lat,
    lng: item.lng,
    address: typeof item.address === "string" ? item.address : null,
    contactName: typeof item.contactName === "string" ? item.contactName : null,
    contactPhone:
      typeof item.contactPhone === "string" ? item.contactPhone : null,
    locationSource:
      item.locationSource === "SALES_VISIT" ? "SALES_VISIT" : "ADMIN_BRANCH",
    organization: { id: org.id, name: org.name },
  };
}

export function useDispatchDestinations(warehouseId: string, address: string) {
  const [stores, setStores] = useState<DispatchStore[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [storeError, setStoreError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [suggestions, setSuggestions] = useState<DispatchAddressSuggestion[]>(
    [],
  );
  useEffect(() => {
    const controller = new AbortController();
    void dispatchRequest<{ stores: unknown[] }>("/warehouses/store-locations", {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted)
          setStores(
            data.stores
              .map(normalizeStore)
              .filter((item): item is DispatchStore => item !== null),
          );
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setStoreError(
            error instanceof Error
              ? error.message
              : "Дэлгүүрүүдийг ачаалж чадсангүй.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingStores(false);
      });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (!warehouseId) return;
      void dispatchRequest<DispatchAddressSuggestion[]>(
        `/warehouses/${encodeURIComponent(warehouseId)}/dispatch-addresses?${new URLSearchParams({ limit: "6", query: address })}`,
        { signal: controller.signal },
      )
        .then((data) => {
          if (!controller.signal.aborted) setSuggestions(data);
        })
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions([]);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [warehouseId, address]);
  return {
    stores,
    loadingStores,
    storeError,
    suggestions,
    reload: () => {
      setLoadingStores(true);
      setStoreError("");
      setAttempt((value) => value + 1);
    },
  };
}
