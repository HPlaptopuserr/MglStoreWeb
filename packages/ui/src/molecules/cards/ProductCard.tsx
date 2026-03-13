"use client";

import { WishlistButton } from "../../atoms/WishlistButton";
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
  stock,
  storeName,
  isPrime = false,
}: ProductCardProps) => {
  const hasDiscount =
    typeof originalPrice === "number" && originalPrice > price;

  const discountPercent = hasDiscount
    ? Math.round(((originalPrice! - price) / originalPrice!) * 100)
    : 0;

  const soldOut = typeof stock === "number" && stock <= 0;

  return (
    <div className="group relative flex flex-col bg-white">
      {/* Image Container */}
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

        <Link href="#" className="block h-full w-full">
          <Image
            src={image}
            alt={name || "product image"}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        </Link>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-0.5 pt-3">
        {/* Price */}
        <div className="flex items-baseline gap-2 flex-wrap">
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

        {/* Product Name */}
        <Link
          href="#"
          className="text-sm text-black hover:underline line-clamp-1 mt-0.5"
        >
          {name}
        </Link>

        {/* Category */}
        {category && <span className="text-xs text-gray-500">{category}</span>}

        {/* Store Name */}
        {storeName && (
          <span className="text-xs text-gray-400 mt-0.5">{storeName}</span>
        )}

        {/* Prime Badge */}
        {isPrime && (
          <div className="flex items-center gap-1 mt-2 text-[11px] text-gray-500">
            <span className="font-bold italic text-[#00A8E1]">
              <span className="text-[#FF9900]">✓</span>prime
            </span>
            <span>options available</span>
          </div>
        )}
      </div>
    </div>
  );
};
