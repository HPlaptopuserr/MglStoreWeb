"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { ProductCard } from "@mgl/ui";

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
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
};

export function ProductResultsGrid({
  products,
  loading,
  currentPage,
  totalPages,
  totalProducts,
  pageSize,
  hasActiveFilters,
  onClearFilters,
  onPageChange,
}: ProductResultsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 15 }).map((_, index) => (
          <div key={index} className="h-[260px] animate-pulse rounded-xl border border-slate-100 bg-slate-50" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
        <Search className="mx-auto mb-4 h-12 w-12 text-slate-200" />
        <p className="text-sm font-black text-slate-500">
          {hasActiveFilters ? "Шүүлтэд тохирох бараа олдсонгүй" : "Энэ ангилалд бараа байхгүй байна"}
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 rounded-xl bg-slate-950 px-5 py-2 text-xs font-black text-white transition hover:bg-orange-500"
          >
            Шүүлтийг цэвэрлэх
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {products.map((product) => {
          const discount = product.discounts?.[0]?.percent;
          const originalPrice = discount ? product.price : undefined;
          const finalPrice = discount ? Math.round(product.price * (1 - discount / 100)) : product.price;
          return (
            <ProductCard
              key={product.id}
              href={`/products/${product.id}`}
              image={product.images?.[0]?.url}
              price={finalPrice}
              name={product.name}
              category={product.businessCategory?.name}
              originalPrice={originalPrice}
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
