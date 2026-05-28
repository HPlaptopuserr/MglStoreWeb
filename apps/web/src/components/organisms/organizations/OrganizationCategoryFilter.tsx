"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const listRef = useRef<HTMLDivElement | null>(null);

  const scroll = (dir: "left" | "right") => {
    listRef.current?.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  };

  return (
    <div className="sticky top-[112px] z-30 border-b border-gray-200/70 bg-gray-50/95 backdrop-blur-md md:top-[120px]">
      <div className="relative mx-auto max-w-7xl px-3 sm:px-6">
        <div className="pointer-events-none absolute bottom-0 left-3 top-0 z-10 w-12 bg-gradient-to-r from-gray-50/95 to-transparent sm:left-6" />
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-3 top-1/2 z-20 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-900 sm:left-6 sm:flex"
        >
          <ChevronLeft size={14} />
        </button>

        <div
          ref={listRef}
          className="flex items-center gap-1.5 overflow-x-auto py-3 scrollbar-hide sm:gap-2 sm:py-3.5"
          style={{ scrollbarWidth: "none" }}
        >
          {categories.map((cat) => {
            const isActive = activeFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onChange(cat)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all sm:px-4 sm:py-2 ${
                  isActive
                    ? "bg-[#FFAD02] text-gray-900 shadow-sm shadow-[#FFAD02]/30"
                    : "border border-gray-200 bg-white text-gray-500 hover:border-[#FFAD02]/40 hover:text-gray-800"
                }`}
              >
                {cat === "all" ? "Бүгд" : toCategoryMN(cat)}
              </button>
            );
          })}
        </div>

        {/* Right fade + arrow */}
        <div className="pointer-events-none absolute bottom-0 right-3 top-0 z-10 w-12 bg-gradient-to-l from-gray-50/95 to-transparent sm:right-6" />
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-3 top-1/2 z-20 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-900 sm:right-6 sm:flex"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
