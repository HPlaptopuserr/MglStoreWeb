"use client";

import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import type { SearchOption } from "./search-model";

export interface SearchOptionState {
  items: SearchOption[];
  loading: boolean;
  error: boolean;
}

export function useSearchOptions(open: boolean) {
  const [retry, setRetry] = useState(0);
  const [categories, setCategories] = useState<SearchOptionState>({
    items: [],
    loading: true,
    error: false,
  });
  const [organizations, setOrganizations] = useState<SearchOptionState>({
    items: [],
    loading: true,
    error: false,
  });

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    async function load(
      path: string,
      setState: (state: SearchOptionState) => void,
    ) {
      setState({ items: [], loading: true, error: false });
      try {
        const response = await fetch(`${API}/${path}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Search options: ${response.status}`);
        const payload: SearchOption[] | { data: SearchOption[] } =
          await response.json();
        const items = Array.isArray(payload) ? payload : payload.data;
        if (!Array.isArray(items)) throw new Error("Invalid search options");
        if (!controller.signal.aborted)
          setState({ items, loading: false, error: false });
      } catch {
        if (!controller.signal.aborted)
          setState({ items: [], loading: false, error: true });
      }
    }
    void load("business-categories?hasProducts=1", setCategories);
    // Suggestions are bounded; full organization searches use the paginated directory.
    void load("partners?status=ACTIVE&limit=24&page=1", setOrganizations);
    return () => controller.abort();
  }, [open, retry]);

  return {
    categories,
    organizations,
    retry: () => setRetry((value) => value + 1),
  };
}
