"use client";

import { memo, useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
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
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <ul
        key={page}
        className="grid min-h-0 min-w-0 flex-1 grid-cols-[repeat(auto-fill,minmax(min(100%,168px),1fr))] content-start gap-2 overflow-y-auto overscroll-contain p-0.5 [scrollbar-gutter:stable]"
      >
        {visibleProducts.map((product) => {
          const quantity = quantities.get(product.id) ?? 0;
          return (
            <ProductCard
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

const ProductCard = memo(function ProductCard({
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
        className={`group flex h-full min-h-44 w-full min-w-0 flex-col rounded-2xl border bg-white p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 disabled:cursor-not-allowed ${quantity > 0 ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200 hover:border-indigo-300"} ${unavailable ? "text-slate-500" : "text-slate-900"}`}
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span
            className="min-w-0 truncate rounded-md bg-slate-100 px-1.5 py-1 font-mono text-[10px] font-semibold text-slate-600"
            title={product.sku}
          >
            {product.sku}
          </span>
          <span
            aria-label={`Нөөц: ${formatPosQuantity(product.stockQty, product.measureUnit)}`}
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums ${unavailable ? "border-rose-100 bg-rose-50 text-rose-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
          >
            {unavailable
              ? product.stockQty <= 0
                ? "Дууссан"
                : "Нөөц хүрсэн"
              : product.measureUnit === "kg"
                ? `${product.stockQty.toLocaleString("mn-MN", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} кг`
                : formatPosQuantity(product.stockQty, product.measureUnit)}
          </span>
        </span>
        <span className="mt-3 line-clamp-2 min-h-9 w-full break-words text-[13px] font-bold leading-[18px] [overflow-wrap:anywhere]">
          {product.name}
        </span>
        <span className="mt-0.5 block w-full truncate font-mono text-[10px] font-medium tracking-wide text-slate-400">
          {product.barcode ? `#${product.barcode}` : ""}
        </span>
        <span className="flex min-h-6 items-center py-1">
          {quantity > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600">
              <Check size={11} aria-hidden="true" />
              <span>
                Сагсанд: {formatPosQuantity(quantity, product.measureUnit)}
              </span>
            </span>
          )}
        </span>
        <span className="mt-auto flex w-full items-end justify-between gap-2 border-t border-slate-100 pt-2.5">
          <span className="min-w-0">
            <span className="mb-1 block text-[10px] text-slate-400">
              Нэгж үнэ
            </span>
            <span className="break-words font-mono text-base font-bold tabular-nums [overflow-wrap:anywhere]">
              ₮{product.price.toLocaleString("mn-MN")}
              <span className="font-sans text-[11px] font-medium text-slate-400">
                /{product.measureUnit === "kg" ? "кг" : "ш"}
              </span>
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${unavailable ? "bg-slate-100 text-slate-300" : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"}`}
          >
            <Plus size={18} strokeWidth={2.5} />
          </span>
        </span>
      </button>
    </li>
  );
});
