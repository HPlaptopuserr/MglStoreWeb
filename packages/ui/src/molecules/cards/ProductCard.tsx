"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ImageIcon, PackageCheck, ShoppingCart, Star, Store } from "lucide-react";
import type { ProductCardProps } from "@mgl/types";

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
  rating = 4.8,
  reviews,
  onWishlistToggle,
  onAddToCart,
}: ProductCardProps) => {
  const [localWishlistActive, setLocalWishlistActive] = useState(wishlistActive);
  const hasDiscount = typeof originalPrice === "number" && originalPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;
  const soldOut = !isPreorder && typeof stock === "number" && stock <= 0;
  const lowStock = !isPreorder && typeof stock === "number" && stock > 0 && stock <= 5;
  const primaryTag = tag || tags?.[0];
  const hasCartAction = typeof onAddToCart === "function";

  const badge = hasDiscount
    ? { label: `-${discountPercent}%`, className: "bg-red-500 text-white" }
    : isPreorder
      ? { label: preorderLeadTimeDays ? `${preorderLeadTimeDays} хоног` : "Захиалгаар", className: "bg-blue-500 text-white" }
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
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-gray-100 bg-white shadow-[0_8px_26px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(15,23,42,0.14)]">
      <Link href={href} className="relative block aspect-[4/3] w-full overflow-hidden bg-gray-100">
        {image ? (
          <Image
            src={image}
            alt={name || "Product image"}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100">
            <ImageIcon className="h-10 w-10 text-gray-300" />
          </div>
        )}

        {badge && (
          <span
            className={`absolute left-4 top-4 z-10 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide shadow-sm ${badge.className}`}
          >
            {badge.label}
          </span>
        )}

        {soldOut && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/45">
            <span className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-black">
              Дууссан
            </span>
          </div>
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
        className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black shadow-sm ring-1 ring-black/5 transition hover:scale-105 hover:bg-white"
      >
        <Heart
          className={`h-5 w-5 ${localWishlistActive ? "fill-red-500 text-red-500" : ""}`}
          strokeWidth={2}
        />
      </button>

      <div className="relative flex flex-1 flex-col px-5 pb-5 pt-4">
        {category && (
          <span className="mb-2 w-fit rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
            {category}
          </span>
        )}

        <Link
          href={href}
          className="line-clamp-2 min-h-10 text-base font-semibold leading-5 text-gray-950 transition hover:text-orange-600"
        >
          {name}
        </Link>

        {storeName && (
          <span className="mt-1 inline-flex min-w-0 items-center gap-1 truncate text-sm text-gray-400">
            <Store className="h-3.5 w-3.5 shrink-0 text-gray-300" />
            {storeName}
          </span>
        )}

        {isPreorder && (
          <span className="mt-2 w-fit rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
            Захиалгаар
          </span>
        )}

        <div className="mt-3 flex items-baseline gap-2 pr-14">
          <span className={`text-lg font-black ${hasDiscount ? "text-red-500" : "text-gray-950"}`}>
            ₮{price.toLocaleString()}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              ₮{originalPrice.toLocaleString()}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-1.5 pr-14 text-sm text-gray-500">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span>{rating.toFixed(1)}</span>
          {typeof reviews === "number" && <span>({reviews})</span>}
        </div>

        <button
          type="button"
          disabled={soldOut}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCartClick();
          }}
          className={`absolute bottom-3 right-5 flex h-11 w-11 items-center justify-center rounded-full shadow-[0_8px_20px_rgba(15,23,42,0.12)] ring-1 ring-black/5 transition ${
            soldOut
              ? "cursor-not-allowed bg-gray-100 text-gray-300"
              : "bg-white text-gray-950 hover:scale-105 hover:bg-black hover:text-white"
          }`}
        >
          {soldOut ? <PackageCheck className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
        </button>
      </div>
    </article>
  );
};
