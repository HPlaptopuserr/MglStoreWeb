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
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const normalizedName = name.trim();
  const normalizedBarcode = barcode.trim();

  useEffect(() => {
    if (disabled || (!normalizedBarcode && normalizedName.length < 2)) {
      setProducts([]);
      setLoading(false);
      setError(false);
      return;
    }

    setProducts([]);
    setLoading(true);
    setError(false);
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
          if (controller.signal.aborted) return;
          setProducts(
            Array.isArray(body) ? (body as MasterCatalogProduct[]) : [],
          );
        } catch (error) {
          if (!controller.signal.aborted) { setProducts([]); setError(true); }
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
  }, [disabled, normalizedBarcode, normalizedName, retry]);


  if (disabled || (!normalizedBarcode && normalizedName.length < 2)) return null;
  if (error) return <div role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Нэгдсэн сангийн саналыг ачаалж чадсангүй. <button type="button" onClick={() => setRetry((value) => value + 1)} className="font-semibold underline">Дахин оролдох</button></div>;
  if (!loading && products.length === 0) return <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Нэгдсэн санд тохирох бараа олдсонгүй. Мэдээллээ бөглөөд шинэ бараагаар бүртгэнэ үү.</p>;

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
            {loading ? "Нэгдсэн сангаас хайж байна…" : selectedId ? "Барааны мэдээллийг сонголоо" : "Энэ таны бүртгэх бараа мөн үү?"}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {selectedId ? "Доор нэр, мэдээллээ шалгаад өөрийн үнэ, үлдэгдлээ оруулна уу." : "Нэгдсэн сангаас олдлоо. Мөн бол сонгож нэр, ангилал, зургийг бөглүүлнэ үү."}
          </p>
        </div>
        {!loading && (
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-indigo-600 ring-1 ring-indigo-100">
            {products.length} бараа
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
                className={`flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${selected ? "bg-white" : "hover:bg-white/80"}`}
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
                <div className="min-w-0 flex-1 basis-40">
                  <p className="break-words text-sm font-bold text-slate-900">
                    {product.canonicalName}
                  </p>
                  <p className="break-words text-xs font-medium text-slate-500">
                    {[product.barcode ? `Баркод: ${product.barcode}` : null, product.brand, product.categoryName]
                      .filter(Boolean)
                      .join(" · ") || "Үндсэн мэдээлэл"}
                  </p>
                  {product.usageCount > 0 && <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-indigo-600">
                    <Sparkles size={11} /> {product.usageCount} дэлгүүр ашиглаж
                    байна
                  </p>}
                </div>
                <span
                  className={`flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${selected ? "bg-emerald-100 text-emerald-700" : "bg-indigo-600 text-white shadow-sm"}`}
                >
                  {selected ? (
                    <><Check size={16} /><span>Мэдээлэл бөглөгдсөн</span></>
                  ) : (
                    <span>Энэ барааг ашиглах</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {!loading && !selectedId && <p className="border-t border-indigo-100 bg-white/70 px-4 py-3 text-xs leading-5 text-slate-500">Өөр бараа бол сонголт хийхгүйгээр доорх мэдээллээ бөглөөрэй. Зарах үнэ, үлдэгдлээ та өөрөө оруулна.</p>}
    </section>
  );
}
