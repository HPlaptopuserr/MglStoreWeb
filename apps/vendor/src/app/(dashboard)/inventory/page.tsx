"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Boxes, Loader2, PackageSearch, Search } from "lucide-react";
import { formatPosQuantity } from "@mgl/types";
import { useOwnProducts } from "@/features/pos";

function getCurrentOrganizationId() {
  if (typeof window === "undefined") return "";
  try {
    const user = JSON.parse(localStorage.getItem("vendor_user") || "{}");
    return typeof user.organizationId === "string" ? user.organizationId : "";
  } catch {
    return "";
  }
}

export default function CashierInventoryPage() {
  const [organizationId] = useState(getCurrentOrganizationId);
  const [query, setQuery] = useState("");
  const { products, loading, error, reload } = useOwnProducts(organizationId);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("mn-MN");
    if (!normalized) return products;
    return products.filter((product) =>
      [product.name, product.sku, product.barcode]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase("mn-MN").includes(normalized),
        ),
    );
  }, [products, query]);

  return (
    <section className="space-y-5" aria-labelledby="cashier-inventory-title">
      <div className="rounded-3xl bg-slate-950 px-5 py-6 text-white shadow-sm sm:px-7">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <Boxes className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 id="cashier-inventory-title" className="text-xl font-bold sm:text-2xl">
              Барааны үлдэгдэл
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Кассын ажилтан барааны мэдээлэл, үлдэгдлийг зөвхөн харах боломжтой.
            </p>
          </div>
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
        <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
        <span className="sr-only">Бараа хайх</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Нэр, SKU эсвэл баркодоор хайх"
          className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </label>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" aria-label="Ачаалж байна" />
        </div>
      ) : error ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-6 text-center">
          <AlertCircle className="h-8 w-8 text-rose-500" aria-hidden="true" />
          <p className="text-sm font-semibold text-rose-700">{error}</p>
          <button type="button" onClick={reload} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700">
            Дахин ачаалах
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-300 bg-white text-center">
          <PackageSearch className="h-9 w-9 text-slate-300" aria-hidden="true" />
          <p className="font-semibold text-slate-700">Бараа олдсонгүй</p>
          <p className="text-sm text-slate-400">Хайлтын үгээ шалгаад дахин оролдоно уу.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 sm:grid-cols-[minmax(0,1fr)_180px_140px] sm:px-6">
            <span>Бараа</span>
            <span className="hidden sm:block">SKU / баркод</span>
            <span className="text-right">Үлдэгдэл</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {filteredProducts.map((product) => (
              <li key={product.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_180px_140px] sm:px-6">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{product.name}</p>
                  <p className="mt-1 truncate text-xs text-slate-400 sm:hidden">{product.sku}{product.barcode ? ` · ${product.barcode}` : ""}</p>
                </div>
                <div className="hidden min-w-0 sm:block">
                  <p className="truncate text-sm font-medium text-slate-600">{product.sku}</p>
                  <p className="truncate text-xs text-slate-400">{product.barcode || "Баркодгүй"}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex rounded-xl px-3 py-1.5 text-sm font-bold ${product.stockQty > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {formatPosQuantity(product.stockQty, product.measureUnit)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
