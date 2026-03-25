import type { CartLine, PosProduct } from "../types/pos.types";

type Props = {
  products: PosProduct[];
  cartLines?: CartLine[];
  onSelect: (product: PosProduct) => void;
};

export function PosProductGrid({ products, cartLines = [], onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {products.map((product) => {
        const inCartQty = cartLines.find((line) => line.productId === product.id)?.qty ?? 0;
        const isOutOfStock = product.stockQty <= 0 || inCartQty >= product.stockQty;

        return (
          <div
            key={product.id}
            className="rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-violet-300"
          >
            <p className="text-sm font-medium text-slate-900">{product.name}</p>
            <p className="text-xs text-slate-500">SKU: {product.sku}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-violet-700">
                {product.price.toLocaleString()} MNT
              </p>
              <span className="text-xs text-slate-500">Нөөц: {product.stockQty}</span>
            </div>
            <button
              type="button"
              onClick={() => onSelect(product)}
              disabled={isOutOfStock}
              className="mt-3 w-full rounded-lg bg-violet-600 px-2 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isOutOfStock ? "Нөөц хүрэлцэхгүй" : "Сагсанд нэмэх"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
