"use client";
import { ManagedProductImage } from "./ManagedProductImage";
import { Pencil, Zap } from "lucide-react";
import type { ManagedProduct } from "./managed-product.types";
import {
  formatManagedPrice,
  formatManagedStock,
} from "./managed-product-display";

export function ManagedProductTable({
  products,
  onEdit,
  onQuickEdit,
}: {
  products: ManagedProduct[];
  onEdit: (product: ManagedProduct) => void;
  onQuickEdit: (product: ManagedProduct) => void;
}) {
  return (
    <div
      className="overflow-x-auto rounded-2xl border border-slate-200"
      tabIndex={0}
      role="region"
      aria-label="Барааны хүснэгт"
    >
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">
          Барааны нэр, код, үнэ, нөөц, төлөв ба засах үйлдэл
        </caption>
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            {["Бараа / код", "Үнэ", "Нөөц", "Төлөв", "Үйлдэл"].map(
              (heading) => (
                <th scope="col" key={heading} className="px-4 py-3">
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => (
            <tr key={product.id} className="transition hover:bg-orange-50/40">
              <th scope="row" className="max-w-xs px-4 py-4">
                <div className="mb-2 relative h-12 w-12 overflow-hidden rounded-lg bg-slate-50">
                  <ManagedProductImage
                    url={product.images?.[0]?.url}
                    name={product.name}
                    sizes="48px"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onEdit(product)}
                  className="text-left font-bold text-slate-900 hover:text-orange-700 focus-visible:ring-2 focus-visible:ring-orange-300"
                >
                  {product.name}
                </button>
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  {product.sku || "Кодгүй"}
                </span>
              </th>
              <td className="whitespace-nowrap px-4 py-4 font-bold">
                {formatManagedPrice(product)}
              </td>
              <td className="whitespace-nowrap px-4 py-4">
                {formatManagedStock(product)}
              </td>
              <td className="px-4 py-4">
                <span
                  className={`whitespace-nowrap rounded-lg px-2 py-1 text-xs font-bold ${product.isActive === false ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}
                >
                  {product.isActive === false ? "Идэвхгүй" : "Идэвхтэй"}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    aria-label={`${product.name} засах`}
                    className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl bg-orange-50 px-3 font-bold text-orange-700 hover:bg-orange-100 focus-visible:ring-4 focus-visible:ring-orange-200"
                  >
                    <Pencil size={15} />
                    Засах
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickEdit(product)}
                    aria-label={`${product.name} — үнэ, нөөц засах`}
                    className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 px-3 hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-orange-200"
                  >
                    <Zap size={15} />
                    Үнэ, нөөц
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
