"use client";

import { WishlistButton } from "../../atoms/WishlistButton";
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
  stock,
  storeName,
  isPrime = false,
  onAddToCart,
}: ProductCardProps) => {
  const hasDiscount =
    typeof originalPrice === "number" && originalPrice > price;

  const discountPercent = hasDiscount
    ? Math.round(((originalPrice! - price) / originalPrice!) * 100)
    : 0;

  const soldOut = typeof stock === "number" && stock <= 0;

  return (
    <div className="group relative flex flex-col bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-orange-200 transition-colors duration-200">
      <div className="relative aspect-square w-full bg-gray-100 overflow-hidden">
        <WishlistButton
          onClick={() => console.log("wishlist")}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        />

        {soldOut && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/40">
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
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18a.75.75 0 00.75-.75V6.75a.75.75 0 00-.75-.75H3a.75.75 0 00-.75.75v12.75c0 .414.336.75.75.75z" />
              </svg>
            </div>
          )}
        </Link>
      </div>

      <div className="flex flex-col gap-0.5 pt-3 px-3 pb-3">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            className={`text-sm font-bold ${hasDiscount ? "text-red-600" : "text-black"}`}
          >
            ₮{price.toLocaleString()}
          </span>
          {hasDiscount && (
            <>
              <span className="text-xs text-gray-500 line-through">
                ₮{originalPrice!.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-red-600">
                -{discountPercent}%
              </span>
            </>
          )}
        </div>

        <Link
          href={href}
          className="text-sm text-black hover:underline line-clamp-1 mt-0.5"
        >
          {name}
        </Link>

        {category && <span className="text-xs text-gray-500">{category}</span>}

        {storeName && (
          <span className="text-xs text-gray-400 mt-0.5">{storeName}</span>
        )}

        <button
          disabled={soldOut}
          className={`mt-3 w-full p-3 text-xs font-semibold rounded-xl transition-colors ${
            soldOut
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gray-100 text-gray-700 hover:bg-orange-500 hover:text-white active:scale-[0.98]"
          }`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!soldOut) onAddToCart?.(); }}
        >
          {soldOut ? "Дууссан" : "Сагслах"}
        </button>
      </div>
    </div>
  );
};
