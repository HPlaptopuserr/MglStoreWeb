"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  ImageIcon,
  PackageCheck,
  ShoppingCart,
  Star,
  Store,
} from "lucide-react";
import type { ProductCardProps } from "@mgl/types";

type ProductCardViewProps = ProductCardProps & {
  showCartAction?: boolean;
};

export const ProductCard = ({
  href = "#",
  image,
  price,
  originalPrice,
  name,
  category,
  tag,
  tags,
  stock,
  isPreorder = false,
  preorderLeadTimeDays,
  storeName,
  isPrime = false,
  wishlistActive = false,
  showCartAction = false,
  rating = 4.8,
  onWishlistToggle,
  onAddToCart,
}: ProductCardViewProps) => {
  const [localWishlistActive, setLocalWishlistActive] = useState(wishlistActive);
  const hasDiscount = typeof originalPrice === "number" && originalPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;
  const soldOut = !isPreorder && typeof stock === "number" && stock <= 0;
  const lowStock = !isPreorder && typeof stock === "number" && stock > 0 && stock <= 5;
  const primaryTag = tag || tags?.[0];
  const hasCartAction = showCartAction && typeof onAddToCart === "function";

  const badge = soldOut
    ? { label: "Дууссан", className: "bg-black text-white" }
    : hasDiscount
      ? { label: `-${discountPercent}%`, className: "bg-red-500 text-white" }
    : isPreorder
      ? {
          label: preorderLeadTimeDays
            ? `${preorderLeadTimeDays} хоног`
            : "Захиалгаар",
          className: "bg-blue-500 text-white",
        }
    : isPrime
      ? { label: "PRIME", className: "bg-black text-white" }
      : lowStock
        ? { label: `${stock} үлдсэн`, className: "bg-amber-400 text-black" }
        : primaryTag
          ? { label: primaryTag, className: "bg-blue-500 text-white" }
          : null;

  const handleWishlistClick = () => {
    const nextValue = !localWishlistActive;
    setLocalWishlistActive(nextValue);
    onWishlistToggle?.(nextValue);
  };

  const handleCartClick = () => {
    if (soldOut) return;
    if (hasCartAction) onAddToCart?.();
    else window.location.href = href;
  };

  return (
    <article className="group relative flex h-full min-h-[230px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-100/60 sm:min-h-[252px]">
      <Link href={href} className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-50">
        {image ? (
          <Image
            src={image}
            alt={name || "Product image"}
            fill
            className="object-contain p-3 transition duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(251,146,60,0.16),transparent_28%),linear-gradient(135deg,#f8fafc,#fff7ed)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 text-slate-300 shadow-sm ring-1 ring-slate-100">
              <ImageIcon className="h-8 w-8" />
            </div>
          </div>
        )}

        {badge && (
          <span
            className={`absolute left-2.5 top-2.5 z-20 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide shadow-sm sm:left-3 sm:top-3 ${badge.className}`}
          >
            {badge.label}
          </span>
        )}

        {soldOut && (
          <div className="absolute inset-0 z-10 bg-slate-950/25" />
        )}
      </Link>

      <button
        type="button"
        aria-label="Wishlist"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleWishlistClick();
        }}
        className="absolute right-2.5 top-2.5 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-sm ring-1 ring-black/5 transition hover:scale-105 hover:bg-white sm:right-3 sm:top-3"
      >
        <Heart
          className={`h-4 w-4 ${localWishlistActive ? "fill-red-500 text-red-500" : ""}`}
          strokeWidth={2}
        />
      </button>

      <div className="relative flex flex-1 flex-col px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
        {category && (
          <span className="mb-2 max-w-full truncate rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
            {category}
          </span>
        )}

        <Link
          href={href}
          className="line-clamp-2 min-h-10 text-[13px] font-bold leading-5 text-slate-950 transition hover:text-orange-600 sm:text-sm"
        >
          {name}
        </Link>

        {storeName && (
          <span className="mt-1 inline-flex min-w-0 items-center gap-1 truncate text-[12px] font-medium text-slate-400">
            <Store className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            {storeName}
          </span>
        )}

        {isPreorder && (
          <span className="mt-2 w-fit rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
            Захиалгаар
          </span>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <span
              className={`block truncate text-base font-black leading-5 sm:text-lg ${
                hasDiscount ? "text-red-500" : "text-slate-950"
              }`}
            >
              ₮{price.toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="block truncate text-xs text-slate-400 line-through">
                ₮{originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-slate-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>{rating.toFixed(1)}</span>
          </div>
        </div>

        {showCartAction && (
          <button
            type="button"
            disabled={soldOut}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCartClick();
            }}
            className={`mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-black shadow-sm transition ${
              soldOut
                ? "cursor-not-allowed bg-slate-100 text-slate-300"
                : "bg-slate-950 text-white hover:bg-orange-500"
            }`}
          >
            {soldOut ? (
              <>
                <PackageCheck className="h-4 w-4" />
                Дууссан
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Сагсанд
              </>
            )}
          </button>
        )}
      </div>
    </article>
  );
};
