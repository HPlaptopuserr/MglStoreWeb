"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Package, Search, X } from "lucide-react";

export interface DispatchEditableProduct {
  id: string;
  name: string;
  sku: string | null;
  barcode?: string | null;
  price: number;
  availableQuantity: number;
}

interface Props {
  products: DispatchEditableProduct[];
  value: string;
  excludedIds: Set<string>;
  loading: boolean;
  error?: string;
  onSearchChange: (query: string) => void;
  onChange: (productId: string) => void;
}

export function DispatchProductPicker({
  products,
  value,
  excludedIds,
  loading,
  error,
  onSearchChange,
  onChange,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = products.find((product) => product.id === value);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const updateQuery = (nextQuery: string) => {
    setQuery(nextQuery);
    onSearchChange(nextQuery);
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex min-h-12 w-full items-center gap-3 rounded-xl border bg-white px-3 py-2 text-left transition ${
          open
            ? "border-blue-500 ring-4 ring-blue-100"
            : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Package className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm font-bold ${selected ? "text-slate-900" : "text-slate-400"}`}
          >
            {selected?.name || "Бараа сонгох"}
          </span>
          {selected && (
            <span className="mt-0.5 block truncate text-[11px] text-slate-500">
              {selected.sku || "SKU-гүй"} · ₮
              {Number(selected.price).toLocaleString()} · үлдэгдэл{" "}
              {selected.availableQuantity === Number.MAX_SAFE_INTEGER
                ? "одоогийн бараа"
                : selected.availableQuantity}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setOpen(false);
                }}
                placeholder="Нэр, SKU эсвэл баркод..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => updateQuery("")}
                  aria-label="Хайлт цэвэрлэх"
                  className="absolute right-2 top-2 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-2 px-1 text-[11px] text-slate-400">
              {loading ? "Хайж байна..." : `${products.length} бараа олдлоо`}
            </p>
          </div>

          <div
            role="listbox"
            className="max-h-72 overflow-y-auto overscroll-contain p-2"
          >
            {error && (
              <div className="m-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                {error}
              </div>
            )}
            {loading && products.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" /> Бараа
                хайж байна
              </div>
            ) : products.length === 0 ? (
              <div className="py-10 text-center">
                <Package className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  Бараа олдсонгүй
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Өөр нэр, SKU эсвэл баркодоор хайна уу.
                </p>
              </div>
            ) : (
              products.map((product) => {
                const disabled = excludedIds.has(product.id);
                const active = product.id === value;
                return (
                  <button
                    key={product.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={disabled}
                    onClick={() => {
                      onChange(product.id);
                      setOpen(false);
                      updateQuery("");
                    }}
                    className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition last:mb-0 ${
                      active
                        ? "bg-blue-50 ring-1 ring-blue-200"
                        : "hover:bg-slate-50"
                    } disabled:cursor-not-allowed disabled:opacity-35`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}
                    >
                      {active ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Package className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-800">
                        {product.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                        {product.sku || "SKU-гүй"}
                        {product.barcode ? ` · ${product.barcode}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-xs font-bold text-slate-700">
                        ₮{Number(product.price).toLocaleString()}
                      </span>
                      <span
                        className={`mt-0.5 block text-[10px] font-semibold ${product.availableQuantity > 0 ? "text-emerald-600" : "text-red-500"}`}
                      >
                        {product.availableQuantity === Number.MAX_SAFE_INTEGER
                          ? "Одоогийн бараа"
                          : `${product.availableQuantity} ш`}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
