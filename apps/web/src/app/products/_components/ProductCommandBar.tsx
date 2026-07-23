"use client";

import { ChevronDown, Grid2X2, SlidersHorizontal } from "lucide-react";

type SortOption<T extends string> = {
  key: T;
  label: string;
};

type SupplyOption<T extends string> = {
  key: T;
  label: string;
  description: string;
};

type ProductCommandBarProps<SortKey extends string, SupplyKey extends string> = {
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
};

export function ProductCommandBar<SortKey extends string, SupplyKey extends string>({
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
}: ProductCommandBarProps<SortKey, SupplyKey>) {
  return (
    <div className="sticky top-[7.75rem] z-40 border-b border-slate-100 bg-white/92 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/82 max-md:top-[4rem]">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {supplyOptions.map((option) => {
              const active = supplyFilter === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onSupplyClick(option.key)}
                  className={`flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-black transition sm:h-10 sm:px-4 ${
                    active
                      ? "border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-100"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-200 hover:bg-white hover:text-orange-600"
                  }`}
                >
                  {option.label}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? "bg-white/20" : "bg-slate-100 text-slate-400"}`}>
                    {supplyCounts[option.key]}
                  </span>
                </button>
              );
            })}
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
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="hidden items-center gap-2 text-xs font-bold text-slate-400 sm:flex">
              <Grid2X2 className="h-4 w-4" />
              {total} үр дүн
            </div>

            <div className="flex items-center gap-2">
              <label className="relative">
                <span className="sr-only">Эрэмбэлэх</span>
                <select
                  value={sortKey}
                  onChange={(event) => onSortChange(event.target.value as SortKey)}
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
