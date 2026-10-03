"use client";
import { useEffect, useState } from "react";
import { useAdminAuth } from "@/lib/admin-auth";
import {
  fetchAdminSalesStores,
  type AdminSalesStoresPage,
} from "@/lib/admin-sales-stores-api";

export function useSalesStores(
  days: number | "all",
  q: string,
  status: string,
  page: number,
) {
  const { authFetch } = useAdminAuth();
  const [data, setData] = useState<AdminSalesStoresPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setData(null);
      setError(null);
      try {
        const result = await fetchAdminSalesStores(
          authFetch,
          { days, q, status, page },
          controller.signal,
        );
        if (!controller.signal.aborted) setData(result);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Мэдээлэл ачаалагдсангүй",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [authFetch, days, q, status, page, revision]);
  return {
    data,
    loading,
    error,
    reload: () => setRevision((value) => value + 1),
  };
}
