"use client";

import { useId } from "react";
import type { Product } from "../types";
import { VendorSkuGenerator } from "./VendorSkuGenerator";

interface ProductSkuFieldProps {
  editing: boolean;
  productName: string;
  products: Product[];
  value: string;
  onChange: (sku: string) => void;
}

export function ProductSkuField({ editing, ...props }: ProductSkuFieldProps) {
  const id = useId();
  // The generator owns creation defaults. Never mount its automatic effects
  // while editing: the visible catalog may be only one filtered page.
  if (!editing) return <VendorSkuGenerator {...props} />;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-slate-700">
        SKU код
      </label>
      <input
        id={id}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        aria-describedby={`${id}-help`}
        autoComplete="off"
        placeholder="SKU код"
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm outline-none transition-colors hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      <p id={`${id}-help`} className="text-xs text-slate-500">
        Одоогийн код хэвээр хадгалагдана. Зөвхөн код солих шаардлагатай үед засна уу.
      </p>
    </div>
  );
}
