"use client";

import {
  formatCatalogMoney,
  ProductCatalogImage,
  ProductCatalogStatus,
} from "./ProductCatalogItemParts";
import type { ProductCatalogItemsProps } from "./product-catalog.types";

export function ProductCatalogGrid({
  items,
  onItemClick,
  renderActions,
  disabledIds,
}: ProductCatalogItemsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {items.map((item) => {
        const disabled = disabledIds?.has(item.id) ?? false;

        return (
          <article
            key={item.id}
            onClick={() => !disabled && onItemClick?.(item)}
            onKeyDown={(event) => {
              if (!disabled && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                onItemClick?.(item);
              }
            }}
            role={onItemClick ? "button" : undefined}
            tabIndex={onItemClick && !disabled ? 0 : undefined}
            aria-disabled={disabled || undefined}
            className={`group relative min-w-0 rounded-2xl border bg-white p-2.5 transition ${
              disabled
                ? "cursor-not-allowed border-slate-100 opacity-50"
                : "cursor-pointer border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-md"
            }`}
          >
            <ProductCatalogImage item={item} variant="grid" />
            <div className="px-1 pb-1 pt-2.5">
              <div className="flex min-w-0 items-start gap-2">
                <h3 className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">
                  {item.name}
                </h3>
                {renderActions && (
                  <div
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    {renderActions(item)}
                  </div>
                )}
              </div>
              <p className="mt-1 truncate font-mono text-[11px] font-semibold text-slate-400">
                {item.code || item.barcode || "Кодгүй"}
              </p>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-slate-900">
                    {formatCatalogMoney(item.price)}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    Нөөц: {item.stock ?? "—"}
                  </p>
                </div>
                <ProductCatalogStatus item={item} />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
