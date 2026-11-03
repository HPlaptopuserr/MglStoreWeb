"use client";

import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ManagedProduct } from "./managed-product.types";

export const CATALOG_PAGE_SIZE = 24;
interface CatalogPage {
  products: ManagedProduct[];
  total: number;
  hasMore: boolean;
}

export function useManagedProductCatalog(
  organizationId: string,
  revision: number,
) {
  const { authFetch } = useAuth();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState({
    productStatus: "",
    stock: "",
    supplyType: "",
    businessCategoryId: "",
  });
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<CatalogPage>({
    products: [],
    total: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          ...filters,
          organizationId,
          includeInactive: "true",
          meta: "true",
          search: search.trim(),
          sort,
          limit: String(CATALOG_PAGE_SIZE),
          offset: String(page * CATALOG_PAGE_SIZE),
        });
        const response = await authFetch(`${API}/products?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("Барааны жагсаалтыг ачаалж чадсангүй.");
        const data: CatalogPage = await response.json();
        if (!Array.isArray(data.products) || typeof data.total !== "number")
          throw new Error("Барааны мэдээлэл буруу байна.");
        if (!controller.signal.aborted) {
          const lastPage = Math.max(
            0,
            Math.ceil(data.total / CATALOG_PAGE_SIZE) - 1,
          );
          if (page > lastPage) setPage(lastPage);
          else setResult(data);
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Сүлжээний алдаа гарлаа.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [authFetch, organizationId, page, search, sort, revision, retry, filters]);

  return {
    ...result,
    loading,
    error,
    page,
    search,
    sort,
    setPage,
    filters,
    hasFilters: Boolean(search || Object.values(filters).some(Boolean)),
    changeFilter: (key: keyof typeof filters, value: string) => {
      setFilters((current) => ({
        ...current,
        [key]: value,
        ...(key === "stock"
          ? { supplyType: "" }
          : key === "supplyType"
            ? { stock: "" }
            : {}),
      }));
      setPage(0);
    },
    resetFilters: () => {
      setSearch("");
      setFilters({
        productStatus: "",
        stock: "",
        supplyType: "",
        businessCategoryId: "",
      });
      setPage(0);
    },
    changeSearch: (value: string) => {
      setSearch(value);
      setPage(0);
    },
    changeSort: (value: string) => {
      setSort(value);
      setPage(0);
    },
    reload: () => setRetry((value) => value + 1),
  };
}
