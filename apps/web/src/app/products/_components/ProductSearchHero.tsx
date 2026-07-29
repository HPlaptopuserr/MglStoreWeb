"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import type { MarketplaceCategory } from "@/components/organisms/commerce/MarketplaceBoard";

type ProductSearchHeroProps = {
  categories: MarketplaceCategory[];
  activeCategory: string | null;
  searchQuery: string;
  total: number;
  onCategoryClick: (categoryId: string | null) => void;
  onSearchSubmit?: (query: string) => void;
  showSearch?: boolean;
};

export function ProductSearchHero({
  categories,
  activeCategory,
  searchQuery,
  total,
  onCategoryClick,
  onSearchSubmit,
  showSearch = true,
}: ProductSearchHeroProps) {
  const [query, setQuery] = useState(searchQuery);
  const [categoryRotation, setCategoryRotation] = useState(0);
  const categoryRailRef = useRef<HTMLElement>(null);

  useEffect(() => setQuery(searchQuery), [searchQuery]);

  const orderedCategories = useMemo(() => {
    if (categories.length === 0) return categories;
    const offset = categoryRotation % categories.length;
    return [...categories.slice(offset), ...categories.slice(0, offset)];
  }, [categories, categoryRotation]);

  const scrollCategories = (direction: -1 | 1) => {
    categoryRailRef.current?.scrollBy({
      left: direction * Math.max(280, window.innerWidth * 0.55),
      behavior: "smooth",
    });
  };

  const rotateCategories = () => {
    setCategoryRotation((current) =>
      categories.length > 0 ? (current + 4) % categories.length : 0,
    );
    categoryRailRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  return (
    <section className="sticky top-16 z-[42] border-b border-slate-100 bg-white/95 shadow-[0_8px_24px_-24px_rgba(15,23,42,0.5)] backdrop-blur supports-[backdrop-filter]:bg-white/90 max-md:top-[7.25rem]">
      <div
        className={`container mx-auto px-4 lg:px-8 ${
          showSearch ? "py-5 lg:py-7" : "py-3"
        }`}
      >
        <div className={showSearch ? "mx-auto max-w-5xl" : ""}>
          {showSearch && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onSearchSubmit?.(query.trim());
              }}
              className="relative w-full"
            >
              <label htmlFor="catalog-search" className="sr-only">
                Бүтээгдэхүүн хайх
              </label>
              <input
                id="catalog-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Барааны нэр, дэлгүүр, ангиллаар хайх..."
                className="h-12 w-full rounded-xl border-2 border-orange-500 bg-white pl-5 pr-28 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-orange-100"
              />
              <button
                type="submit"
                aria-label="Хайх"
                className="absolute right-0 top-0 flex h-12 w-24 items-center justify-center gap-2 rounded-r-xl bg-orange-500 text-sm font-black text-white transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              >
                <Search className="h-5 w-5" aria-hidden="true" />
                Хайх
              </button>
            </form>
          )}

          <div
            className={`flex min-w-0 items-center gap-2 ${
              showSearch ? "mt-4 pb-1" : "py-0.5"
            }`}
          >
            <CarouselButton
              label="Өмнөх ангиллууд"
              onClick={() => scrollCategories(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </CarouselButton>

            <nav
              ref={categoryRailRef}
              aria-label="Бүтээгдэхүүний ангилал"
              className="flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth scrollbar-hide"
            >
              <CategoryChip
                label="Бүх бүтээгдэхүүн"
                count={total}
                active={!activeCategory}
                onClick={() => onCategoryClick(null)}
              />
              {orderedCategories.map((category) => (
                <CategoryChip
                  key={category.id}
                  label={category.name}
                  count={category.productCount ?? category._count?.products}
                  active={
                    activeCategory === category.id ||
                    Boolean(category.slug && activeCategory === category.slug)
                  }
                  onClick={() => onCategoryClick(category.id)}
                />
              ))}
            </nav>

            <CarouselButton
              label="Дараагийн ангиллууд"
              onClick={() => scrollCategories(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </CarouselButton>
            <CarouselButton
              label="Ангиллыг шинэчлэх"
              onClick={rotateCategories}
            >
              <RefreshCw className="h-4 w-4" />
            </CarouselButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function CarouselButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 active:scale-95"
    >
      {children}
    </button>
  );
}

interface CategoryChipProps {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}

function CategoryChip({ label, count, active, onClick }: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-black transition ${
        active
          ? "border-slate-950 bg-slate-950 text-white shadow-md shadow-slate-200"
          : "border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-600"
      }`}
    >
      {label}
      {typeof count === "number" && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] ${
            active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-400"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
