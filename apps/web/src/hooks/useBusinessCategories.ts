import { useState, useEffect } from "react";
import { API } from "@/lib/api";
import type { BusinessCategory } from "@/types/category";

export function useBusinessCategories() {
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API}/business-categories?hasProducts=1`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setCategories(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load categories",
          );
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, error };
}
