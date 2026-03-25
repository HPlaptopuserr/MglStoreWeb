import { useEffect, useState } from "react";
import { getOwnProducts } from "../api/get-own-products";
import type { PosProduct } from "../types/pos.types";

export function useOwnProducts(organizationId: string) {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setProducts([]);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setError(null);

    getOwnProducts(organizationId, ac.signal)
      .then(setProducts)
      .catch((e: any) => {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Бараа ачаалахад алдаа гарлаа");
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [organizationId]);

  return { products, loading, error };
}
