"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, ShoppingBag, ShoppingCart, Store } from "lucide-react";
import { useState } from "react";
import { addToCart } from "@/lib/cart";
import type { ReelItem } from "../_lib/reels.types";
import { formatMnt, mediaUrl, parsePrice } from "../_lib/reels.utils";

type ReelCommercePanelProps = {
  item: ReelItem;
  orgSlug?: string | null;
};

export function ReelCommercePanel({ item, orgSlug }: ReelCommercePanelProps) {
  const [added, setAdded] = useState(false);
  const product = item.product;
  const productPrice = parsePrice(product?.price);
  const productImage = mediaUrl(product?.images?.[0]?.url);

  if (!product) {
    return (
      <div className="mt-4 max-w-[310px] rounded-3xl bg-white/12 p-2.5 text-white ring-1 ring-white/12 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-black">
            <Store size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">Дэлгүүрийн reel</p>
            <p className="text-[11px] font-bold text-white/58">
              Байгууллагын бараа, үйлчилгээ үзэх
            </p>
          </div>
        </div>
        <Link
          href={orgSlug ? `/store/${orgSlug}` : "/products"}
          className="mt-2 flex h-10 items-center justify-center rounded-2xl bg-white text-xs font-black text-black transition hover:bg-orange-500 hover:text-white"
        >
          Дэлгүүр үзэх
        </Link>
      </div>
    );
  }

  const addProductToCart = () => {
    if (!productPrice) return;
    addToCart({
      id: product.id,
      name: product.name,
      price: productPrice,
      quantity: 1,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="mt-4 max-w-[330px] rounded-3xl bg-white p-2.5 text-black shadow-2xl">
      <Link
        href={`/products/${encodeURIComponent(product.id)}`}
        className="flex items-center gap-3 rounded-2xl transition hover:bg-slate-50"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
          {productImage ? (
            <span className="relative h-full w-full overflow-hidden rounded-2xl">
              <Image
                src={productImage}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
              />
            </span>
          ) : (
            <ShoppingBag size={20} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">{product.name}</p>
          <p className="mt-0.5 text-base font-black text-orange-600">
            {formatMnt(product.price)}
          </p>
        </div>
      </Link>
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
        <Link
          href={`/products/${encodeURIComponent(product.id)}`}
          className="flex h-10 items-center justify-center rounded-2xl bg-black px-4 text-xs font-black text-white transition hover:bg-orange-600"
        >
          Бараа үзэх
        </Link>
        <button
          type="button"
          disabled={!productPrice}
          onClick={addProductToCart}
          className="flex h-10 min-w-11 items-center justify-center rounded-2xl bg-orange-500 px-3 text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          aria-label="Сагсанд нэмэх"
        >
          {added ? <Check size={17} /> : <ShoppingCart size={17} />}
        </button>
      </div>
    </div>
  );
}
