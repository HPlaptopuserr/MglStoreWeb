"use client";

import { ChevronDown, Grid2X2, SlidersHorizontal, Store } from "lucide-react";

type SortOption<T extends string> = {
  key: T;
  label: string;
};

type SupplyOption<T extends string> = {
  key: T;
  label: string;
  description: string;
};

type ProductCommandBarProps<
  SortKey extends string,
  SupplyKey extends string,
> = {
  total: number;
  activeFilterCount: number;
  sortOptions: SortOption<SortKey>[];
  sortKey: SortKey;
  supplyOptions: SupplyOption<SupplyKey>[];
  supplyFilter: SupplyKey;
  supplyCounts: Record<SupplyKey, number>;
  discountOnly: boolean;
  filterPanelOpen: boolean;
  onSortChange: (key: SortKey) => void;
  onSupplyClick: (key: SupplyKey) => void;
  onDiscountToggle: () => void;
  onToggleFilters: () => void;
  viewMode: "products" | "stores";
  onViewModeChange: (mode: "products" | "stores") => void;
};

export function ProductCommandBar<
  SortKey extends string,
  SupplyKey extends string,
>({
  total,
  activeFilterCount,
  sortOptions,
  sortKey,
  supplyOptions,
  supplyFilter,
  supplyCounts,
  discountOnly,
  filterPanelOpen,
  onSortChange,
  onSupplyClick,
  onDiscountToggle,
  onToggleFilters,
  viewMode,
  onViewModeChange,
}: ProductCommandBarProps<SortKey, SupplyKey>) {
  return (
    <div className="relative z-30 border-b border-slate-100 bg-white">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center gap-7 overflow-x-auto border-b border-slate-100 py-3 scrollbar-hide">
          <button
            type="button"
            onClick={() => {
              onViewModeChange("products");
              onSupplyClick(supplyOptions[0].key);
            }}
            className={`relative h-9 shrink-0 text-sm font-black transition ${
              viewMode === "products" && supplyFilter === supplyOptions[0].key
                ? "text-orange-600 after:absolute after:inset-x-0 after:-bottom-3 after:h-0.5 after:bg-orange-500"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            Бүх бараа
          </button>
          {supplyOptions.slice(1).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                onViewModeChange("products");
                onSupplyClick(option.key);
              }}
              className={`relative h-9 shrink-0 text-sm font-black transition ${
                viewMode === "products" && supplyFilter === option.key
                  ? "text-orange-600 after:absolute after:inset-x-0 after:-bottom-3 after:h-0.5 after:bg-orange-500"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              {option.label}
              <span className="ml-1.5 text-[10px] text-slate-400">
                {supplyCounts[option.key]}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => onViewModeChange("stores")}
            className={`relative inline-flex h-9 shrink-0 items-center gap-2 text-sm font-black transition ${
              viewMode === "stores"
                ? "text-orange-600 after:absolute after:inset-x-0 after:-bottom-3 after:h-0.5 after:bg-orange-500"
                : "text-slate-600 hover:text-orange-600"
            }`}
          >
            <Store className="h-4 w-4" />
            Дэлгүүрүүд
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("stores")}
            className={`relative h-9 shrink-0 text-sm font-black transition ${
              viewMode === "stores"
                ? "text-orange-600 after:absolute after:inset-x-0 after:-bottom-3 after:h-0.5 after:bg-orange-500"
                : "text-slate-600 hover:text-orange-600"
            }`}
          >
            Байгууллагууд
          </button>
        </div>

        <div className="flex flex-col gap-2 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              type="button"
              onClick={() => onSortChange(sortOptions[0].key)}
              className={`h-9 shrink-0 rounded-xl border px-4 text-sm font-black transition ${
                sortKey === sortOptions[0].key
                  ? "border-orange-500 bg-orange-50 text-orange-600"
                  : "border-slate-200 bg-white text-slate-600 hover:border-orange-200"
              }`}
            >
              Ерөнхий
            </button>
            <button
              type="button"
              onClick={() => onSortChange(sortOptions[1].key)}
              className="h-9 shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
            >
              Шинэ
            </button>
            <button
              type="button"
              onClick={onToggleFilters}
              className="h-9 shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
            >
              Нөөц
            </button>
            <button
              type="button"
              onClick={onDiscountToggle}
              className={`flex h-9 shrink-0 items-center rounded-xl border px-3 text-sm font-black transition sm:h-10 sm:px-4 ${
                discountOnly
                  ? "border-rose-500 bg-rose-500 text-white shadow-md shadow-rose-100"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-rose-200 hover:bg-white hover:text-rose-600"
              }`}
            >
              Хямдрал
            </button>
            <button
              type="button"
              onClick={onToggleFilters}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
            >
              Үнэ
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2">
            <div className="hidden items-center gap-2 text-xs font-bold text-slate-400 sm:flex">
              <Grid2X2 className="h-4 w-4" />
              {total} үр дүн
            </div>

            <div className="flex items-center gap-2">
              <label className="relative">
                <span className="sr-only">Эрэмбэлэх</span>
                <select
                  value={sortKey}
                  onChange={(event) =>
                    onSortChange(event.target.value as SortKey)
                  }
                  className="h-9 appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-8 text-sm font-black text-slate-700 outline-none transition hover:border-orange-200 hover:bg-white focus:border-orange-400 sm:h-10 sm:pl-4 sm:pr-9"
                >
                  {sortOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </label>

              <button
                type="button"
                onClick={onToggleFilters}
                className={`relative flex h-9 items-center gap-2 rounded-xl border px-3 text-sm font-black transition sm:h-10 sm:px-4 ${
                  filterPanelOpen || activeFilterCount > 0
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-950 hover:bg-white"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Шүүлт
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
