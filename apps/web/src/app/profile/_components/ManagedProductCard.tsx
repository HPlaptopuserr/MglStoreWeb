"use client";

import { Pencil, ArrowUpRight, Zap } from "lucide-react";
import {
  formatManagedPrice,
  formatManagedStock,
} from "./managed-product-display";
import { ManagedProductImage } from "./ManagedProductImage";
import type { ManagedProduct } from "./managed-product.types";

export function ManagedProductCard({
  product,
  onEdit,
  onQuickEdit,
}: {
  product: ManagedProduct;
  onQuickEdit: (product: ManagedProduct) => void;
  onEdit: (product: ManagedProduct) => void;
}) {
  const preorder = product.supplyType === "CHINA_PREORDER";
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lg">
      <button
        type="button"
        onClick={() => onEdit(product)}
        aria-label={`${product.name} — зураг, мэдээлэл засах`}
        className="relative aspect-[4/3] overflow-hidden bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-orange-300"
      >
        <ManagedProductImage
          url={product.images?.[0]?.url}
          name={product.name}
          sizes="(max-width: 768px) 45vw, (max-width: 1280px) 28vw, 20vw"
        />
        <span
          className={`absolute left-2 top-2 rounded-lg px-2 py-1 text-xs font-bold ${preorder ? "bg-blue-50 text-blue-700" : product.stock ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
        >
          {formatManagedStock(product)}
        </span>
      </button>
      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <h3
          className="line-clamp-2 min-h-10 text-sm font-bold text-slate-900"
          title={product.name}
        >
          {product.name}
        </h3>
        <p className="text-lg font-black text-slate-950">
          {formatManagedPrice(product)}
        </p>
        <p className="text-xs text-slate-500">
          {product.sku || "Кодгүй"} ·{" "}
          {product.isActive === false ? "Идэвхгүй" : "Идэвхтэй"}
        </p>
        <div className="mt-auto flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(product)}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-50 px-3 text-sm font-bold text-orange-700 transition hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
          >
            <Pencil size={16} />
            Засах
          </button>
          <a
            href={`/products/${encodeURIComponent(product.id)}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`${product.name} — нийтэд харагдах хуудсыг нээх`}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-orange-200"
          >
            <ArrowUpRight size={18} />
          </a>
        </div>
        <button
          type="button"
          onClick={() => onQuickEdit(product)}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-orange-100"
        >
          <Zap size={15} />
          Үнэ, нөөц засах
        </button>
      </div>
    </article>
  );
}
