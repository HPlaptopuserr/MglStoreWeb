"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, ImageIcon, Search, Sparkles, Store } from "lucide-react";
import { resolveMemberPricing } from "@/lib/member-pricing";
import type { MarketplacePricingAudience } from "@mgl/types";

export type ProductResult = {
  id: string;
  name: string;
  price: number;
  stock?: number | null;
  supplyType?: "IN_STOCK" | "CHINA_PREORDER";
  preorderLeadTimeDays?: number | null;
  preorderCapacity?: number | null;
  preorderParticipantCount?: number;
  preorderRemaining?: number | null;
  preorderIsFull?: boolean;
  rating?: number | null;
  reviewCount?: number | null;
  soldCount?: number | null;
  images: { id: string; url: string }[];
  organization: {
    id: string;
    name: string;
    logoUrl?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    soldCount?: number | null;
  } | null;
  discounts: { percent: number }[];
  businessCategory: { id: string; name: string; slug?: string } | null;
};

type ProductResultsGridProps = {
  products: ProductResult[];
  loading: boolean;
  hasActiveFilters: boolean;
  pricingAudience: MarketplacePricingAudience;
  searchQuery: string;
  suggestions?: ProductSearchSuggestion[];
  onClearFilters: () => void;
  onSuggestionClick?: (suggestion: ProductSearchSuggestion) => void;
};

export type ProductSearchSuggestion = {
  type: "search" | "category";
  label: string;
  value: string;
  description?: string;
};

function getCatalogImageSource(url: string): {
  src: string;
  preOptimized: boolean;
} {
  try {
    const pathname = url.startsWith("http") ? new URL(url).pathname : url;
    const match = pathname.match(/^\/mgl-water\/([^/]+)\.jpg$/i);
    if (match) {
      return {
        src: `/mgl-water/thumbs/${match[1]}.webp`,
        preOptimized: true,
      };
    }
  } catch {
    // Invalid external URLs are passed through and handled by next/image.
  }
  return { src: url, preOptimized: false };
}

export function ProductResultsGrid({
  products,
  loading,
  hasActiveFilters,
  pricingAudience,
  searchQuery,
  suggestions = [],
  onClearFilters,
  onSuggestionClick,
}: ProductResultsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 30 }).map((_, index) => (
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {products.map((product, index) => (
            <CatalogProductCard
              key={product.id}
              product={product}
              pricingAudience={pricingAudience}
              priority={index < 6}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export function CatalogProductCard({
  product,
  pricingAudience,
  priority = false,
  compact = false,
}: {
  product: ProductResult;
  pricingAudience: MarketplacePricingAudience;
  priority?: boolean;
  compact?: boolean;
}) {
  const pricing = resolveMemberPricing(
    product.price,
    product.discounts,
    pricingAudience,
    product.supplyType,
  );
  const { price, originalPrice, label: memberLabel } = pricing;
  const isPreorder = product.supplyType === "CHINA_PREORDER";
  const preorderIsFull = isPreorder && Boolean(product.preorderIsFull);
  const discountPercent = product.discounts?.[0]?.percent;
  const catalogImage = product.images?.[0]?.url
    ? getCatalogImageSource(product.images[0].url)
    : null;

  return (
    <article className="group relative min-w-0">
      <Link
        href={`/products/${product.id}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      >
        <div
          className={`relative overflow-hidden bg-slate-100 ${
            compact ? "aspect-[4/3] rounded-xl" : "aspect-square rounded-2xl"
          }`}
        >
          {catalogImage ? (
            <Image
              src={catalogImage.src}
              alt={product.name}
              fill
              sizes={
                compact
                  ? "(max-width: 640px) 45vw, 180px"
                  : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
              }
              quality={72}
              unoptimized={catalogImage.preOptimized}
              priority={priority}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.035]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-300">
              <ImageIcon className="h-10 w-10" aria-hidden="true" />
            </div>
          )}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            {isPreorder && (
              <span
                className={`rounded-lg px-2 py-1 text-[10px] font-black text-white shadow-sm ${
                  preorderIsFull ? "bg-slate-800" : "bg-emerald-500"
                }`}
              >
                {preorderIsFull ? "Дүүрсэн" : "Захиалгаар"}
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

        <div
          className={
            compact
              ? "px-0.5 pb-1 pt-2"
              : "px-0.5 pb-1.5 pt-2 sm:px-1 sm:pb-2 sm:pt-3"
          }
        >
          <h3
            className={`font-bold text-slate-900 transition group-hover:text-orange-600 ${
              compact
                ? "line-clamp-1 text-xs leading-4"
                : "line-clamp-2 min-h-8 text-xs leading-4 sm:min-h-10 sm:text-sm sm:leading-5"
            }`}
          >
            {product.name}
          </h3>
          <div
            className={`${compact ? "mt-1.5" : "mt-2"} flex flex-wrap items-baseline gap-x-2 gap-y-1`}
          >
            <span
              className={`${compact ? "text-base" : "text-base sm:text-xl"} font-black tracking-tight text-orange-600`}
            >
              ₮{price.toLocaleString("mn-MN")}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-xs font-bold text-slate-300 line-through">
                ₮{originalPrice.toLocaleString("mn-MN")}
              </span>
            )}
          </div>
          {!compact && (
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
          )}
          {isPreorder && product.preorderCapacity && (
            <div className={compact ? "mt-1.5" : "mt-2"}>
              <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-500">
                <span>
                  {product.preorderParticipantCount ?? 0}/
                  {product.preorderCapacity} хүн
                </span>
                <span>
                  {preorderIsFull
                    ? "Дүүрсэн"
                    : `${product.preorderRemaining ?? Math.max(0, product.preorderCapacity - (product.preorderParticipantCount ?? 0))} дутуу`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${preorderIsFull ? "bg-slate-700" : "bg-emerald-500"}`}
                  style={{
                    width: `${Math.min(100, ((product.preorderParticipantCount ?? 0) / product.preorderCapacity) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
          <div
            className={`${compact ? "mt-1" : "mt-2"} flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-black text-slate-500`}
          >
            <span className="text-amber-500">
              ★ {(product.rating ?? 0).toFixed(1)}/10
            </span>
            {!compact && <span>{product.reviewCount ?? 0} үнэлгээ</span>}
            <span>{product.soldCount ?? 0} зарагдсан</span>
          </div>
          {!compact && (
            <div className="mt-2 hidden min-w-0 items-center gap-1.5 text-[11px] font-bold text-slate-400 sm:flex">
              <Store className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {product.organization?.name || "MGL Store"}
              </span>
              <span className="ml-auto shrink-0 text-amber-500">
                ★ {(product.organization?.rating ?? 0).toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
