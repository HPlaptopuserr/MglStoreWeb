"use client";

import { Barcode } from "lucide-react";

export type ProductCodeMode = "SKU" | "BARCODE";

export function CodeModeSelect({
  value,
  onChange,
}: {
  value: ProductCodeMode;
  onChange: (value: ProductCodeMode) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm">
      <Barcode className="h-4 w-4 text-slate-500" aria-hidden="true" />
      <span className="sr-only">Бүтээгдэхүүний кодын төрөл</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as ProductCodeMode)}
        className="bg-transparent text-sm font-medium text-slate-700 outline-none"
      >
        <option value="SKU">Код: SKU</option>
        <option value="BARCODE">Код: Баркод</option>
      </select>
    </label>
  );
}
