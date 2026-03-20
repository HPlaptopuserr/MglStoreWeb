"use client";

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
  return (
    <div className="sticky top-[160px] md:top-[120px] z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-3 sm:px-6">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-3">
          {categories.map((cat) => {
            const isActive = activeFilter === cat;

            return (
              <button
                key={cat}
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
        </div>
      </div>
    </div>
  );
}