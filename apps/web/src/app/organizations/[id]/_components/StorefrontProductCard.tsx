"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  resolveMarketplacePricingAudience,
  resolveMemberPricing,
} from "@/lib/member-pricing";

export interface StorefrontProductCardData {
  id: string;
  image: string;
  title: string;
  price: number;
  originalPrice?: number | null;
  category?: string | null;
  rating?: number | null;
  reviews?: number | null;
  soldCount?: number | null;
  stock?: number | null;
  supplyType?: string | null;
  preorderLeadTimeDays?: number | null;
  preorderCapacity?: number | null;
  preorderParticipantCount?: number;
  preorderRemaining?: number | null;
  preorderIsFull?: boolean;
}

interface StorefrontProductCardProps {
  product: StorefrontProductCardData;
}

function formatPrice(price: number) {
  return `${price.toLocaleString("mn-MN")}₮`;
}

function getDiscountPercent(price: number, originalPrice?: number | null) {
  if (!originalPrice || originalPrice <= price) return null;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

export function StorefrontProductCard({ product }: StorefrontProductCardProps) {
  const { user } = useAuth();
  const pricing = resolveMemberPricing(
    product.price,
    null,
    resolveMarketplacePricingAudience(user),
    product.supplyType,
  );
  const discountPercent = getDiscountPercent(
    pricing.price,
    pricing.originalPrice ?? product.originalPrice,
  );
  const isPreorder = product.supplyType === "CHINA_PREORDER";
  const unavailable = isPreorder
    ? Boolean(product.preorderIsFull)
    : product.stock === 0;
  const preorderParticipantCount = product.preorderParticipantCount ?? 0;

  return (
    <article className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_18px_45px_-24px_rgba(234,88,12,0.5)]">
      <Link
        href={`/products/${encodeURIComponent(product.id)}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500"
        aria-label={`${product.title} бүтээгдэхүүнийг харах`}
      >
        <div className="relative aspect-square overflow-hidden bg-slate-100">
          <Image
            src={product.image}
            alt={product.title}
            fill
            sizes="(min-width: 1536px) 220px, (min-width: 1280px) 18vw, (min-width: 768px) 25vw, 50vw"
            quality={78}
            className="object-cover transition duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            {discountPercent && (
              <span className="rounded-lg bg-orange-600 px-2 py-1 text-[10px] font-black text-white shadow-sm">
                -{discountPercent}%
              </span>
            )}
            {isPreorder && (
              <span className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-black text-white shadow-sm">
                {product.preorderLeadTimeDays
                  ? `${product.preorderLeadTimeDays} хоног`
                  : "Захиалгаар"}
              </span>
            )}
          </div>
          <span
            aria-hidden="true"
            className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-slate-600 shadow-sm backdrop-blur transition hover:bg-orange-50 hover:text-orange-600"
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
          </span>
          {unavailable && (
            <div className="absolute inset-x-0 bottom-0 bg-slate-950/75 py-2 text-center text-[11px] font-black text-white backdrop-blur-sm">
              {isPreorder ? "Захиалга дүүрсэн" : "Нөөц дууссан"}
            </div>
          )}
        </div>

        <div className="p-3 sm:p-3.5">
          {product.category && (
            <p className="mb-1 truncate text-[10px] font-bold uppercase tracking-wide text-orange-600">
              {product.category}
            </p>
          )}
          <h3 className="line-clamp-2 min-h-10 text-[13px] font-bold leading-5 text-slate-900 transition group-hover:text-orange-700 sm:text-sm">
            {product.title}
          </h3>

          <div className="mt-2 flex min-h-5 items-center gap-1.5 text-[10px] font-semibold text-slate-400">
            {(product.rating ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-amber-500">
                <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                {(product.rating ?? 0).toFixed(1)}
              </span>
            )}
            {(product.soldCount ?? 0) > 0 && (
              <span>
                {product.soldCount?.toLocaleString("mn-MN")} зарагдсан
              </span>
            )}
            {(product.reviews ?? 0) > 0 && (
              <span>({product.reviews} үнэлгээ)</span>
            )}
          </div>

          <div className="mt-1.5 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-lg font-black tracking-tight text-orange-600 sm:text-xl">
                {formatPrice(pricing.price)}
              </p>
              {pricing.originalPrice && (
                <p className="truncate text-[10px] font-semibold text-slate-400 line-through">
                  {formatPrice(pricing.originalPrice)}
                </p>
              )}
              {pricing.label && (
                <p className="mt-0.5 truncate text-[10px] font-bold text-emerald-600">
                  {pricing.label}
                </p>
              )}
            </div>
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${
                unavailable
                  ? "bg-slate-100 text-slate-300"
                  : "bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white"
              }`}
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          {isPreorder && product.preorderCapacity && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-blue-700">
                <span>
                  {preorderParticipantCount}/{product.preorderCapacity} хүн
                </span>
                <span>
                  {product.preorderIsFull
                    ? "Дүүрсэн"
                    : `${product.preorderRemaining ?? Math.max(0, product.preorderCapacity - preorderParticipantCount)} дутуу`}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-blue-50">
                <div
                  className={`h-full rounded-full ${product.preorderIsFull ? "bg-slate-600" : "bg-blue-500"}`}
                  style={{
                    width: `${Math.min(100, (preorderParticipantCount / product.preorderCapacity) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
