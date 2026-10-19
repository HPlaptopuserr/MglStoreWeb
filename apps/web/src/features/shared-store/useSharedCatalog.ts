"use client";
import { useCallback, useEffect, useState } from "react";
import { SHARED_STORE_API, SHARED_STORE_WAREHOUSE } from "./config";
import { useAuth } from "@/lib/auth-context";
import type { SharedCatalog } from "./types";
export function useSharedCatalog() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<SharedCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({
          warehouseId: SHARED_STORE_WAREHOUSE.id,
          search,
          sort,
          limit: "24",
          offset: String(page * 24),
        });
        const response = await fetch(
          `${SHARED_STORE_API}/store/mini-apps/shared-store/products?${query}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok)
          throw new Error("Барааг ачаалж чадсангүй. Дахин оролдоно уу.");
        const catalog = (await response.json()) as SharedCatalog;
        if (!controller.signal.aborted)
          setData({
            ...catalog,
            warehouses: catalog.warehouses?.length
              ? catalog.warehouses
              : [SHARED_STORE_WAREHOUSE],
            products: catalog.products.map((product) => ({
              ...product,
              warehouse: product.warehouse || SHARED_STORE_WAREHOUSE,
            })),
          });
      } catch (cause: unknown) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Алдаа гарлаа.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, sort, page, revision, user?.id]);
  return {
    data,
    loading,
    error,
    search,
    sort,
    page,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(0);
    },
    setSort: (value: string) => {
      setSort(value);
      setPage(0);
    },
    setPage,
    refresh: useCallback(() => setRevision((value) => value + 1), []),
  };
}
