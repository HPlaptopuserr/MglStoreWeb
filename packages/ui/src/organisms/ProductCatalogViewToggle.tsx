"use client";

import { Grid2X2, List } from "lucide-react";
import type { ProductCatalogViewMode } from "./product-catalog.types";

export function ProductCatalogViewToggle({
  value,
  onChange,
}: {
  value: ProductCatalogViewMode;
  onChange: (view: ProductCatalogViewMode) => void;
}) {
  return (
    <div
      className="inline-flex rounded-full border border-slate-300 bg-white p-0.5 shadow-sm"
      role="group"
      aria-label="Харагдац сонгох"
    >
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={value === "list"}
        className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${
          value === "list"
            ? "bg-indigo-100 text-indigo-700"
            : "text-slate-500 hover:bg-slate-50"
        }`}
      >
        <List size={15} />
        Жагсаалт
      </button>
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-pressed={value === "grid"}
        className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${
          value === "grid"
            ? "bg-indigo-100 text-indigo-700"
            : "text-slate-500 hover:bg-slate-50"
        }`}
      >
        <Grid2X2 size={15} />
        Grid
      </button>
    </div>
  );
}
