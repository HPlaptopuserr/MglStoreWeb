"use client";

import { ChevronLeft, ChevronRight, Search, Sparkles } from "lucide-react";
import { ProductCard } from "@mgl/ui";
import { resolveMemberPricing } from "@/lib/member-pricing";

type ProductResult = {
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
  if (loading) {
    return (
      <div className="grid gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 15 }).map((_, index) => (
          <div key={index} className="h-[260px] animate-pulse rounded-xl border border-slate-100 bg-slate-50" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center sm:py-16">
        <Search className="mx-auto mb-4 h-12 w-12 text-slate-200" />
        <p className="text-sm font-black text-slate-600">
          {hasActiveFilters ? "Шүүлтэд тохирох бараа олдсонгүй" : "Энэ ангилалд бараа байхгүй байна"}
        </p>
        {searchQuery.trim() && (
          <p className="mx-auto mt-2 max-w-sm text-xs font-semibold leading-5 text-slate-400">
            “{searchQuery.trim()}” хайлтад яг таарах бараа алга. Ойролцоо хайлт эсвэл ангиллаар туршаад үзээрэй.
          </p>
        )}

        {suggestions.length > 0 && (
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm">
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

        <button
          type="button"
          onClick={onClearFilters}
          className="mt-5 rounded-xl bg-slate-950 px-5 py-2 text-xs font-black text-white transition hover:bg-orange-500"
        >
          {hasActiveFilters ? "Шүүлтийг цэвэрлэх" : "Бүх бараа харах"}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="grid gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {products.map((product) => {
          const pricing = resolveMemberPricing(product.price, product.discounts, isMember);
          return (
            <ProductCard
              key={product.id}
              href={`/products/${product.id}`}
              image={product.images?.[0]?.url}
              price={pricing.price}
              name={product.name}
              category={product.businessCategory?.name}
              originalPrice={pricing.originalPrice ?? undefined}
              memberDiscountLabel={pricing.label}
              storeName={product.organization?.name}
              stock={product.stock}
              isPreorder={product.supplyType === "CHINA_PREORDER"}
              preorderLeadTimeDays={product.preorderLeadTimeDays}
            />
          );
        })}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-10 flex flex-col items-center gap-4">
          <p className="text-xs font-bold text-slate-400">
            {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalProducts)} / {totalProducts} бараа
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-4 text-sm font-black text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
