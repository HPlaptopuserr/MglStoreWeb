"use client";

import { WishlistButton } from "../../atoms/WishlistButton";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
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

  const handleWishlistClick = () => {
    const nextValue = !localWishlistActive;
    setLocalWishlistActive(nextValue);
    onWishlistToggle?.(nextValue);
  };

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
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
            <span className="rounded bg-red-600 px-2 py-1 text-[11px] font-black leading-none text-white shadow-sm">
              -{discountPercent}%
            </span>
          )}
          {isPrime && (
            <span className="rounded bg-black px-2 py-1 text-[10px] font-bold uppercase leading-none text-white shadow-sm">
              Prime
            </span>
          )}
          {!hasDiscount && primaryTag && (
            <span className="rounded bg-white/95 px-2 py-1 text-[10px] font-bold uppercase leading-none text-slate-700 shadow-sm">
              {primaryTag}
            </span>
          )}
          {lowStock && (
            <span className="rounded bg-amber-400 px-2 py-1 text-[10px] font-bold leading-none text-black shadow-sm">
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
              <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18a.75.75 0 00.75-.75V6.75a.75.75 0 00-.75-.75H3a.75.75 0 00-.75.75v12.75c0 .414.336.75.75.75z" />
              </svg>
            </div>
          )}
        </Link>

        {!soldOut && (
          <button
            className="absolute inset-x-2 bottom-2 z-20 translate-y-2 rounded-lg bg-black px-3 py-2.5 text-xs font-bold text-white opacity-0 shadow-lg transition-all duration-200 hover:bg-orange-500 group-hover:translate-y-0 group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart?.();
            }}
          >
            Сагслах
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-3">
        <div className="mb-1 flex min-h-5 items-center gap-1.5">
          {category && (
            <span className="truncate rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {category}
            </span>
          )}
          {colorCount ? (
            <span className="text-[11px] text-slate-400">{colorCount} өнгө</span>
          ) : null}
        </div>

        <Link
          href={href}
          className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-black hover:underline"
        >
          {name}
        </Link>

        {storeName && <span className="mt-1 truncate text-xs text-gray-400">{storeName}</span>}

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

        <button
          disabled={soldOut}
          className={`mt-auto w-full rounded-lg p-3 text-xs font-semibold transition-colors ${
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
          {soldOut ? "Дууссан" : "Сагслах"}
        </button>
      </div>
    </div>
  );
};
