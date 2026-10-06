"use client";

import { memo, useMemo, useState } from "react";
import { formatPosQuantity, type CartLine, type PosProduct } from "@mgl/types";

import { useEventCallback } from "../hooks/useEventCallback";

interface Props {
  products: PosProduct[];
  cartLines: CartLine[];
  onAdd: (product: PosProduct) => void;
}

const PAGE_SIZE = 50;

export function PosProductList({ products, cartLines, onAdd }: Props) {
  const addProduct = useEventCallback(onAdd);
  const [pagination, setPagination] = useState({ products, page: 0 });
  // Reset immediately when search/category/catalog changes; cart updates keep the page.
  const page = pagination.products === products ? pagination.page : 0;
  const pageCount = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const visibleProducts = products.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  const quantities = useMemo(
    () => new Map(cartLines.map((line) => [line.productId, line.qty])),
    [cartLines],
  );

  return (
    <section
      aria-label="Барааны жагсаалт"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200"
    >
      <div
        aria-hidden="true"
        className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500"
      >
        <span>Бараа / SKU</span>
        <span>Үнэ / Нөөц</span>
      </div>
      <ul
        key={page}
        className="min-h-0 min-w-0 flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain"
      >
        {visibleProducts.map((product) => {
          const quantity = quantities.get(product.id) ?? 0;
          return (
            <ProductRow
              key={product.id}
              product={product}
              quantity={quantity}
              onAdd={addProduct}
            />
          );
        })}
      </ul>
      {pageCount > 1 && (
        <nav
          aria-label="Барааны хуудас"
          className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 p-2 text-xs"
        >
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPagination({ products, page: page - 1 })}
            className="rounded-lg px-3 py-2 font-semibold hover:bg-slate-200 focus-visible:outline-blue-600 disabled:opacity-40"
          >
            Өмнөх
          </button>
          <span aria-live="polite">
            {page + 1} / {pageCount} · {products.length} бараа
          </span>
          <button
            type="button"
            disabled={page + 1 >= pageCount}
            onClick={() => setPagination({ products, page: page + 1 })}
            className="rounded-lg px-3 py-2 font-semibold hover:bg-slate-200 focus-visible:outline-blue-600 disabled:opacity-40"
          >
            Дараах
          </button>
        </nav>
      )}
    </section>
  );
}

const ProductRow = memo(function ProductRow({
  product,
  quantity,
  onAdd,
}: {
  product: PosProduct;
  quantity: number;
  onAdd: Props["onAdd"];
}) {
  const unavailable = product.stockQty <= 0 || quantity >= product.stockQty;
  return (
    <li>
      <button
        type="button"
        disabled={unavailable}
        onClick={() => onAdd(product)}
        aria-label={`${product.name}, ${product.price.toLocaleString("mn-MN")} төгрөг, сагсанд нэмэх`}
        className={`grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] gap-3 px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed ${quantity > 0 ? "bg-blue-50 hover:bg-blue-100" : "bg-white hover:bg-slate-50"} ${unavailable ? "text-slate-400" : "text-slate-900"}`}
      >
        <span className="min-w-0">
          <span className="block break-words text-sm font-bold [overflow-wrap:anywhere]">
            {product.name}
          </span>
          <span className="mt-1 block break-all font-mono text-[11px] text-slate-500">
            SKU: {product.sku}
          </span>
          {product.barcode && product.barcode !== product.sku && (
            <span className="mt-0.5 block break-all font-mono text-[11px] text-slate-500">
              {product.barcode}
            </span>
          )}
          {quantity > 0 && (
            <span className="mt-1 inline-block text-[11px] font-semibold text-blue-700">
              Сагсанд: {formatPosQuantity(quantity, product.measureUnit)}
            </span>
          )}
        </span>
        <span className="min-w-0 text-right tabular-nums">
          <span className="block break-words text-sm font-bold [overflow-wrap:anywhere]">
            ₮{product.price.toLocaleString("mn-MN")}
            {product.measureUnit === "kg" ? "/кг" : ""}
          </span>
          <span className="mt-1 block break-words text-[11px] text-slate-500 [overflow-wrap:anywhere]">
            Нөөц: {formatPosQuantity(product.stockQty, product.measureUnit)}
          </span>
          {unavailable && (
            <span className="mt-1 block text-[11px]">
              {product.stockQty <= 0 ? "Дууссан" : "Нөөц хүрсэн"}
            </span>
          )}
        </span>
      </button>
    </li>
  );
});
