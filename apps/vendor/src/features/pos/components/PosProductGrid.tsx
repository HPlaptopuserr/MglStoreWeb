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
      <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
        <div>
          <PackageSearch className="mx-auto mb-2 h-7 w-7 text-slate-400" />
          <p className="text-sm font-semibold text-slate-700">Бараа олдсонгүй</p>
          <p className="mt-1 text-xs text-slate-500">Нэр, SKU эсвэл barcode-оо шалгаарай</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid max-h-[380px] grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-3">
      {products.map((product) => {
        const inCartQty = cartLines.find((line) => line.productId === product.id)?.qty ?? 0;
        const isOutOfStock = product.stockQty <= 0 || inCartQty >= product.stockQty;

        return (
          <div
            key={product.id}
            className={`group relative flex min-h-[132px] flex-col rounded-xl border bg-white p-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              inCartQty > 0 ? "border-violet-300 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300"
            }`}
          >
            {inCartQty > 0 ? (
              <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                <Check size={10} />
                {inCartQty}
              </span>
            ) : null}
            <p className="line-clamp-2 min-h-9 pr-8 text-sm font-semibold leading-tight text-slate-900">
              {product.name}
            </p>
            <p className="mt-1 truncate text-[11px] text-slate-500">SKU: {product.sku}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-violet-700">
                {product.price.toLocaleString()} MNT
              </p>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                Нөөц: {product.stockQty}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelect(product)}
              disabled={isOutOfStock}
              className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-2 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {!isOutOfStock ? <Plus size={13} /> : null}
              {isOutOfStock ? "Нөөц хүрэлцэхгүй" : "Сагсанд нэмэх"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
