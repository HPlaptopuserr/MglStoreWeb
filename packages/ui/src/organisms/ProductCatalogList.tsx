"use client";

import {
  formatCatalogMoney,
  ProductCatalogImage,
  ProductCatalogStatus,
} from "./ProductCatalogItemParts";
import type {
  ProductCatalogItemsProps,
  ProductCatalogLabels,
} from "./product-catalog.types";

interface Props extends ProductCatalogItemsProps {
  compact: boolean;
  labels: ProductCatalogLabels;
}

const LIST_COLUMNS =
  "lg:grid-cols-[minmax(240px,2fr)_minmax(130px,1fr)_minmax(130px,1fr)_110px_80px_110px_100px_44px]";

export function ProductCatalogList({
  items,
  compact,
  labels,
  onItemClick,
  renderActions,
  disabledIds,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div
        className={`hidden items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-500 lg:grid ${LIST_COLUMNS}`}
      >
        <span>{labels.name}</span>
        <span>{labels.code}</span>
        <span>{labels.category}</span>
        <span className="text-right">{labels.price}</span>
        <span className="text-right">{labels.stock}</span>
        <span>{labels.expiry}</span>
        <span>{labels.status}</span>
        <span />
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item) => {
          const disabled = disabledIds?.has(item.id) ?? false;

          return (
            <div
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
              className={`group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 transition lg:px-4 ${LIST_COLUMNS} ${
                compact ? "py-2" : "py-3"
              } ${
                disabled
                  ? "cursor-not-allowed bg-slate-50 opacity-50"
                  : "cursor-pointer hover:bg-indigo-50/50"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <ProductCatalogImage item={item} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">
                    {item.name}
                  </p>
                  <p className="truncate text-[11px] font-medium text-slate-400 lg:hidden">
                    {item.code ||
                      item.barcode ||
                      item.category ||
                      "Мэдээлэлгүй"}
                  </p>
                  {item.badge && (
                    <span className="mt-0.5 inline-flex rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>
              <div className="hidden min-w-0 lg:block">
                <p className="truncate font-mono text-xs font-semibold text-slate-600">
                  {item.code || "—"}
                </p>
                {item.barcode && (
                  <p className="truncate font-mono text-[10px] text-slate-400">
                    {item.barcode}
                  </p>
                )}
              </div>
              <p className="hidden truncate text-xs font-semibold text-slate-600 lg:block">
                {item.category || "Ангилалгүй"}
              </p>
              <p className="hidden text-right text-sm font-black text-slate-900 lg:block">
                {formatCatalogMoney(item.price)}
              </p>
              <p className="hidden text-right text-sm font-bold text-slate-700 lg:block">
                {item.stock ?? "—"}
              </p>
              <p className="hidden truncate text-xs font-semibold text-slate-500 lg:block">
                {item.expiry || "—"}
              </p>
              <div className="hidden lg:block">
                <ProductCatalogStatus item={item} />
              </div>
              <div
                className="flex items-center justify-end"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {renderActions?.(item)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
