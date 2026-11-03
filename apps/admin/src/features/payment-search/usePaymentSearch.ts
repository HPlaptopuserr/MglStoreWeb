"use client";

import { useEffect, useRef, useState } from "react";
import type { PaymentSearchResponse } from "@mgl/types";
import { API, adminFetch, getApiErrorMessage } from "@/lib/api";

export function usePaymentSearch() {
  const [result, setResult] = useState<PaymentSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const lastQuery = useRef<URLSearchParams | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function search(params: URLSearchParams, page = 1) {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    lastQuery.current = new URLSearchParams(params);
    const query = new URLSearchParams(params);
    query.set("page", String(page));
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await adminFetch(
        `${API}/admin/payments/search?${query}`,
        { signal: request.signal },
      );
      if (!response.ok)
        throw new Error(
          await getApiErrorMessage(response, "Төлбөр хайхад алдаа гарлаа"),
        );
      const data: PaymentSearchResponse = await response.json();
      if (!request.signal.aborted) setResult(data);
    } catch (failure) {
      if (!request.signal.aborted)
        setError(
          failure instanceof Error ? failure.message : "Холболтын алдаа гарлаа",
        );
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  }

  function goToPage(page: number) {
    if (lastQuery.current) void search(lastQuery.current, page);
  }

  return { result, loading, error, search, goToPage };
}
