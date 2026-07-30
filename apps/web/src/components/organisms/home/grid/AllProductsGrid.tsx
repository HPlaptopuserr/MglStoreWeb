"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useInfiniteScroll } from "@mgl/ui";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CatalogProductCard } from "@/app/products/_components/ProductResultsGrid";
import type { ApiProduct } from "./productShowcase";
import {
  LOCAL_MOCK_CATALOG_ENABLED,
  queryLocalCatalog,
} from "@/lib/local-product-catalog";

const BATCH_SIZE = 30;

type ProductsResponse = {
  products?: ApiProduct[];
  total?: number;
  hasMore?: boolean;
};

export function AllProductsGrid() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const hasMore = products.length < total;
  const isMember = Boolean(user?.membership?.active || user?.isPrime);

  useEffect(() => {
    let cancelled = false;
    const isFirstBatch = offset === 0;

    const loadProducts = async () => {
      setError(null);
      if (isFirstBatch) setLoading(true);
      else setLoadingMore(true);

      try {
        if (LOCAL_MOCK_CATALOG_ENABLED) {
          const payload = queryLocalCatalog({
            limit: BATCH_SIZE,
            offset,
            sort: "recommended",
          });
          if (cancelled) return;
          setProducts((current) => {
            if (isFirstBatch) return payload.products;
            const byId = new Map(current.map((product) => [product.id, product]));
            payload.products.forEach((product) => byId.set(product.id, product));
            return [...byId.values()];
          });
          setTotal(payload.total);
          return;
        }

        const params = new URLSearchParams({
          limit: String(BATCH_SIZE),
          offset: String(offset),
          meta: "1",
          sort: "recommended",
        });
        const response = await fetch(`${API}/products?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Products request failed with ${response.status}`);
        }
        const payload = (await response.json()) as ProductsResponse;
        const nextProducts = Array.isArray(payload.products)
          ? payload.products
          : [];
        if (cancelled) return;

        setProducts((current) => {
          if (isFirstBatch) return nextProducts;
          const byId = new Map(
            current.map((product) => [product.id, product]),
          );
          nextProducts.forEach((product) => byId.set(product.id, product));
          return [...byId.values()];
        });
        setTotal(payload.total ?? nextProducts.length);
      } catch {
        if (!cancelled) {
          setError(
            "Нийт бараануудыг ачаалж чадсангүй. Дахин оролдоно уу.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [offset, retryNonce]);

  const loadMoreRef = useInfiniteScroll({
    enabled: !loading && !loadingMore && !error && hasMore,
    onLoadMore: () => setOffset((current) => current + BATCH_SIZE),
  });

  return (
    <section aria-labelledby="all-products-title" className="pt-2">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2
            id="all-products-title"
            className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl"
          >
            Нийт бараанууд
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {total > 0
              ? `${total.toLocaleString()} бүтээгдэхүүн`
              : "Бүх бүтээгдэхүүн"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: BATCH_SIZE }).map((_, index) => (
            <div
              key={index}
              className="h-[260px] animate-pulse rounded-xl border border-slate-100 bg-slate-50"
            />
          ))}
        </div>
      ) : products.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500">
          Одоогоор бүтээгдэхүүн олдсонгүй
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {products.map((product, index) => (
            <CatalogProductCard
              key={product.id}
              product={product}
              isMember={isMember}
              priority={index < 6}
            />
          ))}
        </div>
      )}

      <div
        ref={loadMoreRef}
        className="flex min-h-24 items-center justify-center py-6"
        aria-live="polite"
      >
        {loadingMore ? (
          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin text-orange-500" />
            Бараа ачаалж байна…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm font-semibold text-rose-600">{error}</p>
            <button
              type="button"
              onClick={() => setRetryNonce((value) => value + 1)}
              className="h-10 rounded-xl bg-slate-950 px-5 text-xs font-black text-white transition hover:bg-orange-500"
            >
              Дахин оролдох
            </button>
          </div>
        ) : hasMore ? (
          <span className="sr-only">Дараагийн бараануудыг ачаалах цэг</span>
        ) : products.length > 0 ? (
          <p className="text-xs font-bold text-slate-400">
            {total.toLocaleString()} барааг бүгдийг үзүүллээ
          </p>
        ) : null}
      </div>
    </section>
  );
}
