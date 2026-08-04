"use client";

import { useEffect, useState } from "react";
import { Check, Database, ImageIcon, Loader2, Sparkles } from "lucide-react";
import { API, authFetch } from "@/lib/api";
import type { MasterCatalogProduct } from "../types";

interface Props {
  name: string;
  barcode: string;
  selectedId: string;
  disabled?: boolean;
  onSelect: (product: MasterCatalogProduct) => void;
}

export function MasterCatalogSuggestions({
  name,
  barcode,
  selectedId,
  disabled,
  onSelect,
}: Props) {
  const [products, setProducts] = useState<MasterCatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const normalizedName = name.trim();
  const normalizedBarcode = barcode.trim();

  useEffect(() => {
    if (disabled || (!normalizedBarcode && normalizedName.length < 2)) {
      setProducts([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(
      async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (normalizedBarcode.length >= 4)
          params.set("barcode", normalizedBarcode);
        else params.set("q", normalizedName);

        try {
          const response = await authFetch(
            `${API}/products/master-catalog/search?${params}`,
            {
              signal: controller.signal,
            },
          );
          if (!response.ok) throw new Error("Catalog search failed");
          const body: unknown = await response.json();
          setProducts(
            Array.isArray(body) ? (body as MasterCatalogProduct[]) : [],
          );
        } catch (error) {
          if (!(error instanceof DOMException && error.name === "AbortError"))
            setProducts([]);
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      normalizedBarcode ? 180 : 400,
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [disabled, normalizedBarcode, normalizedName]);

  if (disabled || (!loading && products.length === 0)) return null;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50/50 shadow-sm"
      aria-label="Нэгдсэн барааны сангийн санал"
    >
      <div className="flex items-center gap-2 border-b border-indigo-100 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Database size={15} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-indigo-950">
            Нэгдсэн сангаас олдлоо
          </p>
          <p className="text-[11px] font-semibold text-indigo-500">
            Сонговол барааны мэдээлэл автоматаар бөглөгдөнө
          </p>
        </div>
        {!loading && (
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-indigo-600 ring-1 ring-indigo-100">
            {products.length} санал
          </span>
        )}
      </div>

      {!loading && (
        <div className="max-h-60 divide-y divide-indigo-100 overflow-y-auto">
          {products.map((product) => {
            const selected = selectedId === product.id;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => onSelect(product)}
                aria-pressed={selected}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${selected ? "bg-white" : "hover:bg-white/80"}`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-indigo-100 bg-white">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon size={18} className="text-indigo-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-900">
                    {product.canonicalName}
                  </p>
                  <p className="truncate text-xs font-medium text-slate-500">
                    {[product.brand, product.barcode, product.categoryName]
                      .filter(Boolean)
                      .join(" · ") || "Үндсэн мэдээлэл"}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-indigo-600">
                    <Sparkles size={11} /> {product.usageCount} дэлгүүр ашиглаж
                    байна
                  </p>
                </div>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${selected ? "bg-emerald-100 text-emerald-600" : "bg-white text-indigo-400"}`}
                >
                  {selected ? (
                    <Check size={16} />
                  ) : (
                    <span className="text-lg leading-none">+</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
