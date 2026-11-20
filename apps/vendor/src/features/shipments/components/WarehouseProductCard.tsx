"use client";

import { Check, Minus, Package, Plus } from "lucide-react";
import { useState } from "react";
import type { WarehouseInventoryItem } from "../types/stock-request.types";
import { resolveShipmentAssetUrl } from "../utils/shipment-assets";

interface WarehouseProductCardProps {
  item: WarehouseInventoryItem;
  isHorizontal?: boolean;
  cartQty: number;
  onAdd: (item: WarehouseInventoryItem) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
}

export function WarehouseProductCard({
  item,
  isHorizontal = false,
  cartQty,
  onAdd,
  onQuantityChange,
}: WarehouseProductCardProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const image = resolveShipmentAssetUrl(item.product.images[0]?.url);
  const selected = cartQty > 0;
  const category =
    item.product.businessCategory?.name || item.product.category?.name;
  const available = item.quantity > 0;
  const quantityButton =
    "flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <article
      className={`group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-white transition motion-safe:duration-200 hover:border-slate-300 hover:shadow-md ${isHorizontal ? "w-48 shrink-0" : ""} ${selected ? "border-amber-400 ring-1 ring-amber-100" : "border-slate-200"}`}
    >
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden border-b border-slate-100 bg-slate-50/70">
        <div className="absolute inset-0 p-3 sm:p-4">
          {image && failedImage !== image ? (
            <img
              src={image}
              alt={item.product.name}
              loading="lazy"
              decoding="async"
              width={320}
              height={240}
              onError={() => setFailedImage(image)}
              className="h-full w-full object-contain mix-blend-multiply transition-transform motion-safe:duration-200 motion-safe:group-hover:scale-105"
            />
          ) : (
            <div
              className="flex h-full items-center justify-center"
              aria-label="Зураггүй бараа"
            >
              <Package
                className="h-12 w-12 text-slate-300"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
        {selected && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white">
            <Check className="h-3 w-3" aria-hidden="true" />
            Сагсанд
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <p className="mb-1.5 truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {category || "Агуулахын бараа"}
        </p>
        <h3
          className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-900"
          title={item.product.name}
        >
          {item.product.name}
        </h3>
        <p className="mt-1 truncate text-[11px] text-slate-500">
          SKU: {item.product.sku || "—"}
        </p>
        <div className="mt-auto pt-3">
          <p className="text-lg font-bold tracking-tight tabular-nums text-slate-950">
            {Number(item.product.price).toLocaleString("mn-MN")}
            <span className="ml-0.5 text-sm">₮</span>
          </p>
          <p
            className={`mt-1.5 inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ${available ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
          >
            {available
              ? `Үлдэгдэл: ${item.quantity.toLocaleString()} ш`
              : "Үлдэгдэлгүй"}
          </p>
        </div>
        {selected ? (
          <div className="mt-3 flex min-h-12 shrink-0 items-center justify-between gap-1 rounded-xl bg-amber-50 p-1">
            <button
              type="button"
              aria-label={`${item.product.name} хасах`}
              onClick={() => onQuantityChange(item.product.id, cartQty - 1)}
              className={quantityButton}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span
              className="text-sm font-bold tabular-nums text-slate-900"
              aria-live="polite"
            >
              {cartQty}
            </span>
            <button
              type="button"
              aria-label={`${item.product.name} нэмэх`}
              onClick={() =>
                onQuantityChange(
                  item.product.id,
                  Math.min(item.quantity, cartQty + 1),
                )
              }
              disabled={cartQty >= item.quantity}
              className={quantityButton}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onAdd(item)}
            disabled={!available}
            aria-label={`${item.product.name} сагсанд нэмэх`}
            className="mt-3 flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <Plus className="h-4 w-4" />
            Сагсанд нэмэх
          </button>
        )}
      </div>
    </article>
  );
}
