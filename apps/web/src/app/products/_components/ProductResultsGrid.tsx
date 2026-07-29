"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  ImageIcon,
  Search,
  Sparkles,
  Store,
} from "lucide-react";
import { resolveMemberPricing } from "@/lib/member-pricing";

export type ProductResult = {
  id: string;
  name: string;
  price: number;
  stock?: number;
  supplyType?: "IN_STOCK" | "CHINA_PREORDER";
  preorderLeadTimeDays?: number | null;
  images: { id: string; url: string }[];
  organization: { id: string; name: string; logoUrl?: string | null } | null;
  discounts: { percent: number }[];
  businessCategory: { id: string; name: string; slug?: string } | null;
};

type ProductResultsGridProps = {
  products: ProductResult[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalProducts: number;
  pageSize: number;
  hasActiveFilters: boolean;
  isMember: boolean;
  searchQuery: string;
  suggestions?: ProductSearchSuggestion[];
  onClearFilters: () => void;
  onSuggestionClick?: (suggestion: ProductSearchSuggestion) => void;
  onPageChange: (page: number) => void;
};

export type ProductSearchSuggestion = {
  type: "search" | "category";
  label: string;
  value: string;
  description?: string;
};

export function ProductResultsGrid({
  products,
  loading,
  currentPage,
  totalPages,
  totalProducts,
  pageSize,
  hasActiveFilters,
  isMember,
  searchQuery,
  suggestions = [],
  onClearFilters,
  onSuggestionClick,
  onPageChange,
}: ProductResultsGridProps) {
  const [jumpPage, setJumpPage] = useState("");
  if (loading) {
    return (
      <div className="grid gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 15 }).map((_, index) => (
          <div
            key={index}
            className="h-[260px] animate-pulse rounded-xl border border-slate-100 bg-slate-50"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-7 shadow-sm">
        <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Search className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black text-slate-800">
                {hasActiveFilters
                  ? "Шүүлтэд тохирох бараа олдсонгүй"
                  : "Энэ ангилалд бараа байхгүй байна"}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Өөр ангилал сонгох эсвэл одоогийн шүүлтийг цэвэрлэнэ үү.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearFilters}
            className="h-10 shrink-0 rounded-xl bg-slate-950 px-5 text-xs font-black text-white transition hover:bg-orange-500"
          >
            {hasActiveFilters ? "Шүүлтийг цэвэрлэх" : "Бүх бараа харах"}
          </button>
        </div>
        {searchQuery.trim() && (
          <p className="mt-4 border-t border-slate-100 pt-4 text-xs font-semibold leading-5 text-slate-400">
            “{searchQuery.trim()}” хайлтад яг таарах бараа алга. Ойролцоо хайлт
            эсвэл ангиллаар туршаад үзээрэй.
          </p>
        )}

        {suggestions.length > 0 && (
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left">
            <div className="mb-3 flex items-center gap-2 px-1 text-xs font-black uppercase tracking-wider text-slate-400">
              <Sparkles className="h-4 w-4 text-orange-500" />
              Санал болгох хайлт
            </div>
            <div className="grid gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={`${suggestion.type}-${suggestion.value}`}
                  type="button"
                  onClick={() => onSuggestionClick?.(suggestion)}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-left transition active:scale-[0.99] hover:bg-orange-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-800">
                      {suggestion.label}
                    </span>
                    {suggestion.description && (
                      <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-400">
                        {suggestion.description}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-orange-600 ring-1 ring-orange-100">
                    {suggestion.type === "category" ? "ангилал" : "хайлт"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="grid gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {products.map((product) => (
            <CatalogProductCard
              key={product.id}
              product={product}
              isMember={isMember}
            />
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Бүтээгдэхүүний хуудас"
          className="mt-12 flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 pt-8"
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 transition hover:border-orange-300 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Өмнөх</span>
            </button>
            {buildPageItems(currentPage, totalPages).map((page, index) =>
              page === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-10 w-8 items-center justify-center text-sm font-bold text-slate-300"
                >
                  …
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => onPageChange(page)}
                  aria-current={page === currentPage ? "page" : undefined}
                  className={`flex h-10 min-w-10 items-center justify-center rounded-lg border px-2 text-sm font-black transition ${
                    page === currentPage
                      ? "border-orange-500 bg-orange-500 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-600"
                  }`}
                >
                  {page}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 transition hover:border-orange-300 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <span className="hidden sm:inline">Дараах</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <span className="ml-2 text-xs font-bold text-slate-400">
            {currentPage}/{totalPages}
          </span>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const page = Number(jumpPage);
              if (Number.isInteger(page) && page >= 1 && page <= totalPages) {
                onPageChange(page);
                setJumpPage("");
              }
            }}
            className="ml-2 hidden items-center gap-2 sm:flex"
          >
            <span className="text-xs font-bold text-slate-400">Хуудас</span>
            <input
              value={jumpPage}
              onChange={(event) => setJumpPage(event.target.value)}
              inputMode="numeric"
              aria-label="Очих хуудасны дугаар"
              className="h-10 w-14 rounded-lg border border-slate-200 text-center text-sm font-bold outline-none focus:border-orange-400"
            />
            <button
              type="submit"
              className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-600 transition hover:border-orange-300 hover:text-orange-600"
            >
              Очих
            </button>
          </form>
          <p className="w-full text-center text-xs font-bold text-slate-400">
            {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, totalProducts)} /{" "}
            {totalProducts.toLocaleString()} бараа
          </p>
        </nav>
      )}
    </>
  );
}

function buildPageItems(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([
    1,
    2,
    currentPage - 2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    currentPage + 2,
    totalPages - 1,
    totalPages,
  ]);
  const validPages = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  validPages.forEach((page, index) => {
    const previous = validPages[index - 1];
    if (previous && page - previous > 1) items.push("ellipsis");
    items.push(page);
  });

  return items;
}

export function CatalogProductCard({
  product,
  isMember,
}: {
  product: ProductResult;
  isMember: boolean;
}) {
  const pricing = resolveMemberPricing(
    product.price,
    product.discounts,
    isMember,
  );
  const { price, originalPrice, label: memberLabel } = pricing;
  const isPreorder = product.supplyType === "CHINA_PREORDER";
  const discountPercent = product.discounts?.[0]?.percent;

  return (
    <article className="group relative min-w-0">
      <Link
        href={`/products/${product.id}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      >
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
          {product.images?.[0]?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0].url}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.035]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-300">
              <ImageIcon className="h-10 w-10" aria-hidden="true" />
            </div>
          )}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            {isPreorder && (
              <span className="rounded-lg bg-emerald-500 px-2 py-1 text-[10px] font-black text-white shadow-sm">
                Захиалгаар
              </span>
            )}
            {discountPercent && (
              <span className="rounded-lg bg-orange-500 px-2 py-1 text-[10px] font-black text-white shadow-sm">
                -{discountPercent}%
              </span>
            )}
          </div>
          <span className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100">
            <Heart className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>

        <div className="px-1 pb-2 pt-3">
          <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-900 transition group-hover:text-orange-600">
            {product.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl font-black tracking-tight text-orange-600">
              ₮{price.toLocaleString("mn-MN")}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-xs font-bold text-slate-300 line-through">
                ₮{originalPrice.toLocaleString("mn-MN")}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {memberLabel && (
              <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-black text-orange-600">
                {memberLabel}
              </span>
            )}
            <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
              {isPreorder
                ? `${product.preorderLeadTimeDays ?? 14} хоног`
                : (product.stock ?? 0) > 0
                  ? "Бэлэн"
                  : "Нөөцгүй"}
            </span>
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-slate-400">
            <Store className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {product.organization?.name || "MGL Store"}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
