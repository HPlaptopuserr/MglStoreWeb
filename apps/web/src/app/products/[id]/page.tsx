"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { API } from "@/lib/api";
import { addToCart } from "@/lib/cart";

interface ProductImage { id: string; url: string }
interface Organization { id: string; name: string; logoUrl?: string | null }
interface BusinessCategory { id: string; name: string; slug: string }
interface Discount { percent: number; validUntil: string }

interface Product {
  id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  price: number;
  stock?: number | null;
  images: ProductImage[];
  businessCategory?: BusinessCategory | null;
  organization: Organization;
  discounts: Discount[];
}

function formatPrice(v: number) {
  return `${v.toLocaleString("en-US")}₮`;
}

function useCountdown(target?: string | null) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    if (!target) return;
    const end = new Date(target).getTime();
    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) { setTime({ d: 0, h: 0, m: 0, s: 0 }); return; }
      setTime({
        d: Math.floor(diff / 86_400_000),
        h: Math.floor((diff % 86_400_000) / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1_000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return time;
}

const FAQ_ITEMS = [
  "Бөөндүй – Дараа төлөх нөхцөл",
  "Захиалгын зөрүү төлбөрийг хэрхэн данс руугаа татах вэ?",
  "Захиалгын явцыг хэрхэн харах вэ?",
];

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    fetch(`${API}/products/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { setProduct(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const discount = product?.discounts?.[0];
  const discountedPrice = product ? (discount ? Math.round(product.price * (1 - discount.percent / 100)) : product.price) : 0;
  const originalPrice = product && discount ? product.price : null;
  const savings = originalPrice ? originalPrice - discountedPrice : 0;
  const countdown = useCountdown(discount?.validUntil);
  const images = product?.images ?? [];
  const isOutOfStock = product?.stock === 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <p className="text-gray-400 text-lg font-medium">Бараа олдсонгүй</p>
        <Link href="/products" className="text-sm underline text-gray-500 hover:text-black">Бүх бараа харах</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 lg:px-8 py-2.5">
          <nav className="flex items-center gap-1.5 text-xs text-gray-400">
            <Link href="/" className="hover:text-black transition-colors">Нүүр хуудас</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-black transition-colors">Дэлгүүр</Link>
            {product.businessCategory && (
              <>
                <span>/</span>
                <Link href={`/products?category=${product.businessCategory.slug}`} className="hover:text-black transition-colors">{product.businessCategory.name}</Link>
              </>
            )}
            <span>/</span>
            <span className="text-gray-600 line-clamp-1 max-w-[220px]">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 py-5">
        <div className="flex flex-col lg:flex-row gap-3 items-start">

          {/* ── Col 1: Thumbnail strip ── */}
          {images.length > 1 && (
            <div className="hidden lg:flex flex-col gap-2 w-[76px] shrink-0">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImg(idx)}
                  className={`w-[76px] h-[76px] overflow-hidden bg-white transition-all ${
                    idx === activeImg
                      ? "ring-2 ring-[#FFAD02] ring-offset-1"
                      : "border border-gray-200 hover:border-gray-400 opacity-60 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* ── Col 2: Main image ── */}
          <div className="w-full lg:w-[380px] shrink-0">
            <div className="relative bg-white border border-gray-200 overflow-hidden" style={{ aspectRatio: "1/1" }}>
              {images.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[activeImg]?.url ?? images[0].url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <svg className="w-16 h-16 text-gray-200" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 18h16.5M3.75 4.5h16.5" />
                  </svg>
                </div>
              )}
              {discount && (
                <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-black px-2 py-1 rounded">
                  -{discount.percent}%
                </div>
              )}
              {/* Mobile dot nav */}
              {images.length > 1 && (
                <div className="lg:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, idx) => (
                    <button key={idx} onClick={() => setActiveImg(idx)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === activeImg ? "bg-black" : "bg-gray-300"}`}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* Mobile thumbnail row */}
            {images.length > 1 && (
              <div className="lg:hidden flex gap-2 mt-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button key={img.id} onClick={() => setActiveImg(idx)}
                    className={`flex-shrink-0 w-[60px] h-[60px] border overflow-hidden bg-white transition-all ${
                      idx === activeImg ? "ring-2 ring-[#FFAD02] ring-offset-1 border-transparent" : "border-gray-200"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Col 3: Product info card ── */}
          <div className="flex-1 min-w-0">
            <div className="bg-white border border-gray-100 p-5 rounded-2xl">
              {/* Store mini row */}
              <Link
                href={`/organizations/${product.organization.id}`}
                className="flex items-center gap-2.5 mb-4 group"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
                  {product.organization.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.organization.logoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-black transition-colors leading-none mb-0.5">{product.organization.name}</p>
                  <p className="text-xs text-gray-400">Дэлгүүр харах →</p>
                </div>
              </Link>

              <div className="border-t border-gray-100 pt-4">
                {/* Discount badge */}
                {discount && (
                  <span className="inline-block bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded mb-3">
                    -{discount.percent}%
                  </span>
                )}

                {/* Title */}
                <h1 className="text-base font-bold text-gray-900 leading-snug mb-4">{product.name}</h1>

                {/* Description */}
                {product.description && (
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Дэлгэрэнгүй мэдээлэл</p>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{product.description}</p>
                  </div>
                )}

                {/* Meta */}
                {(product.businessCategory || product.sku) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-4">
                    {product.businessCategory && (
                      <span>Ангилал: <span className="text-gray-600 font-medium">{product.businessCategory.name}</span></span>
                    )}
                    {product.sku && (
                      <span>SKU: <span className="text-gray-500 font-mono">{product.sku}</span></span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Col 4: Price / buy card ── */}
          <div className="w-full lg:w-[240px] shrink-0 flex flex-col gap-3">
            {/* Price card */}
            <div className="bg-white border border-gray-100 p-5 rounded-2xl">
              {/* Price */}
              <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
                <span className="text-2xl font-black text-red-600 leading-none">{formatPrice(discountedPrice)}</span>
                {originalPrice && (
                  <span className="text-sm text-gray-400 line-through">{formatPrice(originalPrice)}</span>
                )}
              </div>
              {savings > 0 && (
                <p className="text-xs text-gray-500 mb-3">Хэмнэлт: <span className="text-green-600 font-semibold">{formatPrice(savings)}</span></p>
              )}

              {/* Stock */}
              {product.stock != null && (
                <p className="text-sm text-gray-600 mb-3">
                  Үлдэгдэл: <span className={`font-bold ${product.stock > 0 ? "text-gray-900" : "text-red-500"}`}>{product.stock > 0 ? product.stock : "Дууссан"}</span>
                </p>
              )}

              {/* Countdown */}
              {discount?.validUntil && (
                <div className="mb-4">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-1.5">Хямдрал дуусахад</p>
                  <div className="grid grid-cols-4 gap-1">
                    {([
                      { val: countdown.d, label: "өдөр" },
                      { val: countdown.h, label: "цаг" },
                      { val: countdown.m, label: "мин" },
                      { val: countdown.s, label: "сек" },
                    ] as const).map(({ val, label }) => (
                      <div key={label} className="bg-[#FFAD02]/10 border border-[#FFAD02]/30 text-center py-1.5 px-0.5">
                        <span className="text-base font-black text-gray-900 tabular-nums block leading-none">{String(val).padStart(2, "0")}</span>
                        <span className="text-[9px] text-gray-500">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <button
                disabled={isOutOfStock}
                onClick={() => {
                  if (!isOutOfStock) {
                    addToCart({
                      id: product.id,
                      name: product.name,
                      price: discountedPrice,
                      image: images[0]?.url,
                      quantity: 1,
                    });
                  }
                }}
                className={`w-full h-11 font-bold text-sm flex items-center justify-center gap-2 transition-all mb-2 ${
                  isOutOfStock
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-[#22c55e] hover:bg-[#16a34a] text-white active:scale-[0.99]"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                {isOutOfStock ? "Нөөц дууссан" : "Сагслах"}
              </button>
              <button
                onClick={() => setWishlisted((w) => !w)}
                className={`w-full h-9 border text-sm flex items-center justify-center gap-2 transition-all ${
                  wishlisted
                    ? "border-red-300 bg-red-50 text-red-500"
                    : "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
                }`}
              >
                <svg
                  className={`w-4 h-4 transition-all ${wishlisted ? "fill-red-500 stroke-red-400" : "fill-none stroke-current"}`}
                  strokeWidth="1.5" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
                {wishlisted ? "Хадгалсан" : "Хадгалах"}
              </button>
            </div>

            {/* FAQ card */}
            <div className="bg-white border border-gray-100 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Түгээмэл асуултууд</p>
              {FAQ_ITEMS.map((q) => (
                <button
                  key={q}
                  className="w-full text-left text-xs text-gray-500 hover:text-gray-900 transition-colors py-2 border-b border-gray-50 flex items-start justify-between gap-2 last:border-none"
                >
                  <span className="leading-relaxed">{q}</span>
                  <svg className="w-3 h-3 shrink-0 text-gray-300 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ── Store banner (below main layout) ── */}
        <div className="mt-4 bg-white border border-gray-100 px-5 py-4 flex items-center justify-between gap-4 rounded-2xl">
          <Link href={`/organizations/${product.organization.id}`} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
              {product.organization.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.organization.logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 group-hover:text-black">{product.organization.name}</p>
              <p className="text-xs text-gray-400">{product.organization.name} · Дэлгүүр</p>
            </div>
          </Link>
          <Link
            href={`/organizations/${product.organization.id}`}
            className="shrink-0 px-4 py-2 border border-[#FFAD02] text-[#FFAD02] hover:bg-[#FFAD02] hover:text-black text-xs font-bold transition-colors"
          >
            Дэлгүүрт зочлох &rsaquo;
          </Link>
        </div>

      </div>
    </div>
  );
}

