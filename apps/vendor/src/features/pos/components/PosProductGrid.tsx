import { Check, PackageSearch, Plus } from "lucide-react";
import type { CartLine, PosProduct } from "../types/pos.types";

type Props = {
  products: PosProduct[];
  cartLines?: CartLine[];
  onSelect: (product: PosProduct) => void;
};

export function PosProductGrid({ products, cartLines = [], onSelect }: Props) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-[180px] flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
        <div>
          <PackageSearch className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">Бараа олдсонгүй</p>
          <p className="mt-1 text-xs text-slate-500">Нэр, SKU эсвэл barcode-оо шалгаарай</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 auto-rows-[172px] grid-cols-2 content-start gap-3 overflow-y-auto pr-1 lg:grid-cols-3 2xl:grid-cols-4">
      {products.map((product) => {
        const inCartQty = cartLines.find((line) => line.productId === product.id)?.qty ?? 0;
        const isOutOfStock = product.stockQty <= 0 || inCartQty >= product.stockQty;

        return (
          <button
            key={product.id}
            type="button"
            onClick={() => onSelect(product)}
            disabled={isOutOfStock}
            className={`group relative flex h-full min-h-0 flex-col rounded-xl border bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${
              inCartQty > 0 ? "border-amber-400 ring-2 ring-amber-100" : "border-slate-200"
            }`}
          >
            {inCartQty > 0 ? (
              <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-black shadow-sm">
                <Check size={10} />
                {inCartQty}
              </span>
            ) : null}

            <div className="flex items-start justify-between gap-2 pr-8">
              <p className="line-clamp-2 h-10 min-w-0 text-sm font-extrabold leading-tight text-slate-950">
                {product.name}
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  product.stockQty <= 0
                    ? "bg-rose-50 text-rose-600"
                    : product.stockQty < 5
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {product.stockQty}
              </span>
            </div>

            <div className="mt-2 min-w-0 space-y-0.5">
              <p className="truncate text-[11px] font-medium text-slate-500">SKU: {product.sku}</p>
              {product.barcode ? (
                <p className="truncate text-[11px] text-slate-400">Barcode: {product.barcode}</p>
              ) : null}
            </div>

            <div className="mt-auto flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Үнэ</p>
                <p className="text-xl font-black leading-none tabular-nums text-slate-950">
                  ₮{product.price.toLocaleString()}
                </p>
              </div>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  isOutOfStock
                    ? "bg-slate-100 text-slate-400"
                    : "bg-slate-950 text-white group-hover:bg-amber-500 group-hover:text-black"
                }`}
              >
                <Plus size={17} strokeWidth={2.6} />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
