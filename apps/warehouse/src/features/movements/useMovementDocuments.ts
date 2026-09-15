"use client";

import { useEffect, useState } from "react";
import { API, wmsFetch } from "@/lib/api";
import type { MovementDocument } from "./movement-document.model";

export type MovementPagination = {
  page: number;
  total: number;
  totalPages: number;
  limit: number;
};
type DocumentResult = {
  documents: MovementDocument[];
  pagination: MovementPagination;
};

export function useMovementDocuments(
  warehouseId: string,
  from: string,
  to: string,
) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<DocumentResult>({
    documents: [],
    pagination: { page: 1, total: 0, totalPages: 0, limit: 20 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Bind page selection to its filters so every new search starts at page one.
  const filterKey = JSON.stringify([warehouseId, from, to, query]);
  const [pageFilterKey, setPageFilterKey] = useState(filterKey);
  const currentPage = pageFilterKey === filterKey ? page : 1;

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          warehouseId,
          page: String(currentPage),
          limit: "20",
        });
        if (query) params.set("search", query);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const response = await wmsFetch(
          `${API}/warehouse-movement-documents?${params}`,
          { signal: controller.signal },
        );
        if (!response.ok)
          throw new Error(
            "Падааны хөдөлгөөн ачаалж чадсангүй. Дахин оролдоно уу.",
          );
        const data: DocumentResult = await response.json();
        if (!Array.isArray(data.documents) || !data.pagination)
          throw new Error("Серверийн хариу буруу байна. Дахин оролдоно уу.");
        if (!controller.signal.aborted) setResult(data);
      } catch (loadError) {
        if (!controller.signal.aborted)
          setError(
            loadError instanceof Error ? loadError.message : "Алдаа гарлаа",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [warehouseId, from, to, query, currentPage, revision]);

  return {
    ...result,
    search,
    setSearch,
    loading,
    error,
    refresh: () => setRevision((value) => value + 1),
    goToPage: (value: number) => {
      setPageFilterKey(filterKey);
      setPage(value);
    },
  };
}
