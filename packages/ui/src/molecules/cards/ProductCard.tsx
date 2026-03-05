"use client";

import { Button } from "../../atoms/Button";
import { WishlistButton } from "../../atoms/WishlistButton";
import { Heart, Star, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ProductCardProps } from "@mgl/types";

export const ProductCard = ({
  image,
  price,
  originalPrice,
  name,
  category,
  tag,
  rating,
  reviews,
  stock,
  storeName,
  tags = [],
  isPrime = false,
}: ProductCardProps) => {
  const hasDiscount =
    typeof originalPrice === "number" && originalPrice > price;

  const discountPercent = hasDiscount
    ? Math.round(((originalPrice! - price) / originalPrice!) * 100)
    : 0;

  const soldOut = typeof stock === "number" && stock <= 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-square w-full bg-slate-100">
        <WishlistButton onClick={() => console.log("wishlist")} />

        {hasDiscount && (
          <div className="absolute left-3 top-3 z-20 rounded-full bg-black px-2.5 py-1 text-xs font-bold text-white">
            -{discountPercent}%
          </div>
        )}

        {tag && (
          <div className="absolute left-3 bottom-3 z-20 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-900 shadow-sm backdrop-blur">
            {tag}
          </div>
        )}

        {soldOut && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/35">
            <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-900">
              Дууссан
            </div>
          </div>
        )}

        <Link href="#" className="block h-full w-full">
          <Image
            src={image}
            alt={name || "product image"}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
          />
        </Link>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Price row */}
        <div className="flex items-end justify-between gap-2">
          <div className="flex items-end gap-2">
            <div className="text-base font-extrabold text-slate-900">
              {price.toLocaleString()}₮
            </div>
            {hasDiscount && (
              <div className="text-sm text-slate-400 line-through">
                {originalPrice!.toLocaleString()}₮
              </div>
            )}
          </div>

          {typeof rating === "number" && (
            <div className="flex items-center gap-1 text-xs text-slate-700">
              <Star className="h-4 w-4" />
              <span className="font-semibold text-slate-900">
                {rating.toFixed(1)}
              </span>
              {typeof reviews === "number" && (
                <span className="text-slate-400">({reviews})</span>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <Link
          href="#"
          className="line-clamp-2 text-sm font-semibold text-slate-900 hover:underline"
        >
          {name}
        </Link>

        {/* Category + Store */}
        <div className="flex items-center justify-between gap-2">
          <div
            className="truncate text-xs font-medium text-slate-600"
            title={storeName}
          >
            {storeName ?? "—"}
          </div>

          <div className="truncate text-xs text-slate-500">
            {category ?? "—"}
          </div>
        </div>

        {/* Stock */}
        {typeof stock === "number" && (
          <div
            className={`text-xs ${stock > 0 ? "text-slate-500" : "text-red-600 font-semibold"}`}
          >
            {stock > 0 ? `Үлдэгдэл: ${stock}` : "Дууссан"}
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-2">
          <Button
            type="button"
            variant={soldOut ? "secondary" : "default"}
            disabled={soldOut}
            className="w-full gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Сагслах
          </Button>

          {isPrime && (
            <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-slate-500">
              <span className="font-bold italic text-[#00A8E1]">
                <span className="text-[#FF9900]">✓</span>prime
              </span>
              <span>options available</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
