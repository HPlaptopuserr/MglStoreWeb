"use client";

import { Check, Plus } from "lucide-react";

export interface WarehouseVendorProduct {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  barcodeAliases?: string[];
  price: string;
  stock: number;
  unit?: string | null;
  images?: { url: string }[];
}

interface Props {
  products: WarehouseVendorProduct[];
  inline?: boolean;
  selectedIds: ReadonlySet<string>;
  onSelect: (product: WarehouseVendorProduct) => void;
}

export function WarehouseVendorProductResults({
  products,
  inline = false,
  selectedIds,
  onSelect,
}: Props) {
  return (
    <div
      className={
        inline
          ? "space-y-1"
          : "absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
      }
    >
      {products.map((product) => (
        <button
          key={product.id}
          type="button"
          disabled={selectedIds.has(product.id)}
          onClick={() => onSelect(product)}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-800">
              {product.name}
            </span>
            <span className="block truncate text-xs text-slate-500">
              {product.barcode || product.sku || "Кодгүй"} ·{" "}
              {product.unit || "ш"}
            </span>
          </span>
          {selectedIds.has(product.id) ? (
            <Check size={16} aria-label="Нэмсэн" />
          ) : (
            <Plus
              size={16}
              aria-label="Нэмэх"
              className="shrink-0 text-blue-600"
            />
          )}
        </button>
      ))}
    </div>
  );
}
