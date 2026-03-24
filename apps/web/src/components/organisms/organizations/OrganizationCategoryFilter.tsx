"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { toCategoryMN } from "@/lib/constants";

interface OrganizationCategoryFilterProps {
  categories: string[];
  activeFilter: string;
  onChange: (value: string) => void;
}

export function OrganizationCategoryFilter({
  categories,
  activeFilter,
  onChange,
}: OrganizationCategoryFilterProps) {
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;

    return categories.filter((cat) => {
      if (cat === "all") return "бүгд".includes(q) || "all".includes(q);
      const label = toCategoryMN(cat).toLowerCase();
      return cat.toLowerCase().includes(q) || label.includes(q);
    });
  }, [categories, query]);

  const scrollByAmount = (amount: number) => {
    listRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="sticky top-[160px] md:top-[120px] z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-3 sm:px-6">
        <div className="flex flex-col gap-2 py-3">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ангилал хайх..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 outline-none transition-all focus:border-gray-300 focus:bg-white focus:ring-2 focus:ring-gray-100"
              />
            </div>

            <div className="ml-auto hidden items-center gap-1 sm:flex">
              <button
                type="button"
                onClick={() => scrollByAmount(-260)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
                aria-label="Scroll categories left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => scrollByAmount(260)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
                aria-label="Scroll categories right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={listRef}
            className="flex items-center gap-2 overflow-x-auto scrollbar-hide"
          >
            {filteredCategories.map((cat) => {
            const isActive = activeFilter === cat;

            return (
              <button
                key={cat}
                  type="button"
                onClick={() => onChange(cat)}
                className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wide transition-all sm:text-xs ${
                  isActive
                    ? "bg-black text-white shadow-sm"
                    : "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                }`}
              >
                {cat === "all" ? "Бүгд" : toCategoryMN(cat)}
              </button>
            );
          })}

            {filteredCategories.length === 0 && (
              <span className="py-2 text-xs font-medium text-gray-400">
                Ангилал олдсонгүй
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}