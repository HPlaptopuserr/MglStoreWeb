"use client";

import { WishlistButton } from "../../atoms/WishlistButton";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, ImageIcon, PackageCheck, Palette, ShoppingCart, Sparkles, Store, Tag } from "lucide-react";
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
  storeName,
  colorCount,
  isPrime = false,
  wishlistActive = false,
  onWishlistToggle,
  onAddToCart,
}: ProductCardProps) => {
  const [localWishlistActive, setLocalWishlistActive] = useState(wishlistActive);
  const hasDiscount = typeof originalPrice === "number" && originalPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice! - price) / originalPrice!) * 100)
    : 0;
  const soldOut = typeof stock === "number" && stock <= 0;
  const lowStock = typeof stock === "number" && stock > 0 && stock <= 5;
  const primaryTag = tag || tags?.[0];
  const hasCartAction = typeof onAddToCart === "function";

  const handleWishlistClick = () => {
    const nextValue = !localWishlistActive;
    setLocalWishlistActive(nextValue);
    onWishlistToggle?.(nextValue);
  };

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-slate-100 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_18px_46px_rgba(15,23,42,0.16)]">
      <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/0 via-black/0 to-black/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <WishlistButton
          active={localWishlistActive}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleWishlistClick();
          }}
          className="opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
        />

        <div className="absolute left-2 top-2 z-20 flex flex-col items-start gap-1.5">
          {hasDiscount && (
            <span className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[11px] font-black leading-none text-white shadow-sm">
              <Sparkles className="h-3 w-3" />
              -{discountPercent}%
            </span>
          )}
          {isPrime && (
            <span className="inline-flex items-center gap-1 rounded bg-black px-2 py-1 text-[10px] font-bold uppercase leading-none text-white shadow-sm">
              <PackageCheck className="h-3 w-3" />
              Prime
            </span>
          )}
          {!hasDiscount && primaryTag && (
            <span className="inline-flex items-center gap-1 rounded bg-white/95 px-2 py-1 text-[10px] font-bold uppercase leading-none text-slate-700 shadow-sm">
              <Tag className="h-3 w-3 text-orange-500" />
              {primaryTag}
            </span>
          )}
          {lowStock && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-400 px-2 py-1 text-[10px] font-bold leading-none text-black shadow-sm">
              <PackageCheck className="h-3 w-3" />
              {stock} үлдсэн
            </span>
          )}
        </div>

        {soldOut && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/45">
            <div className="rounded bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-black">
              Дууссан
            </div>
          </div>
        )}

        <Link href={href} className="block h-full w-full">
          {image ? (
            <Image
              src={image}
              alt={name || "product image"}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
              <ImageIcon className="h-10 w-10 text-gray-300" />
            </div>
          )}
        </Link>

        {!soldOut && hasCartAction && (
          <button
            className="absolute inset-x-2 bottom-2 z-20 inline-flex translate-y-2 items-center justify-center gap-2 rounded-lg bg-black px-3 py-2.5 text-xs font-bold text-white opacity-0 shadow-lg transition-all duration-200 hover:bg-orange-500 group-hover:translate-y-0 group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart?.();
            }}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Сагслах
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-3">
        <div className="mb-1 flex min-h-5 items-center gap-1.5">
          {category && (
            <span className="inline-flex min-w-0 items-center gap-1 truncate rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              <Tag className="h-3 w-3 shrink-0 text-orange-500" />
              {category}
            </span>
          )}
          {colorCount ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Palette className="h-3 w-3" />
              {colorCount} өнгө
            </span>
          ) : null}
        </div>

        <Link
          href={href}
          className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-black hover:underline"
        >
          {name}
        </Link>

        {storeName && (
          <span className="mt-1 inline-flex min-w-0 items-center gap-1 truncate text-xs text-gray-400">
            <Store className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            {storeName}
          </span>
        )}

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className={`text-base font-black ${hasDiscount ? "text-red-600" : "text-black"}`}>
            ₮{price.toLocaleString()}
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-500 line-through">
              ₮{originalPrice!.toLocaleString()}
            </span>
          )}
        </div>

        {hasCartAction ? (
          <button
            disabled={soldOut}
            className={`mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg p-3 text-xs font-semibold transition-colors ${
              soldOut
                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                : "bg-gray-100 text-gray-700 hover:bg-orange-500 hover:text-white active:scale-[0.98]"
            }`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!soldOut) onAddToCart?.();
            }}
          >
            {soldOut ? (
              <>
                <PackageCheck className="h-3.5 w-3.5" />
                Дууссан
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5" />
                Сагслах
              </>
            )}
          </button>
        ) : (
          <Link
            href={href}
            className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 p-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-orange-500 hover:text-white active:scale-[0.98]"
          >
            <Eye className="h-3.5 w-3.5" />
            Дэлгэрэнгүй
          </Link>
        )}
      </div>
    </div>
  );
};
