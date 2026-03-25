import { useEffect, useState } from "react";
import { getPosProducts } from "../api/get-pos-products";
import type { PosProduct } from "../types/pos.types";

export function usePosProducts(branchId: string) {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId) {
      setProducts([]);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setError(null);

    getPosProducts(branchId, ac.signal)
      .then(setProducts)
      .catch((e: any) => {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Products fetch failed");
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [branchId]);

  return { products, loading, error };
}
