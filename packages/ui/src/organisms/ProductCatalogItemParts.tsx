"use client";

import { ImageIcon, Package } from "lucide-react";
import type {
  ProductCatalogItem,
  ProductCatalogStatusTone,
} from "./product-catalog.types";

const STATUS_TONE_CLASSES: Record<ProductCatalogStatusTone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function formatCatalogMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? `₮${numeric.toLocaleString()}`
    : String(value);
}

export function ProductCatalogImage({
  item,
  variant = "list",
}: {
  item: ProductCatalogItem;
  variant?: "list" | "grid";
}) {
  const isGrid = variant === "grid";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-slate-100 bg-slate-50 ${
        isGrid ? "h-32 w-full rounded-xl" : "h-9 w-9 rounded-lg"
      }`}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : isGrid ? (
        <ImageIcon size={28} className="text-slate-300" />
      ) : (
        <Package size={16} className="text-slate-300" />
      )}
    </div>
  );
}

export function ProductCatalogStatus({ item }: { item: ProductCatalogItem }) {
  if (!item.statusLabel) return null;

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${
        STATUS_TONE_CLASSES[item.statusTone ?? "neutral"]
      }`}
    >
      {item.statusLabel}
    </span>
  );
}
