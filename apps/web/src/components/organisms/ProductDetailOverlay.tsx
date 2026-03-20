"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingCart,
  Store,
  Package,
  HelpCircle,
} from "lucide-react";
import { API } from "@/lib/api";
import { addToCart } from "@/lib/cart";

interface ProductImage {
  id: string;
  url: string;
}

interface Organization {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string | null;
}

interface BusinessCategory {
  id: string;
  name: string;
  slug: string;
}

interface Discount {
  percent: number;
  validUntil: string;
}

interface FullProduct {
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

interface Props {
  productId: string;
  onClose: () => void;
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
      if (diff <= 0) {
        setTime({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
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

export function ProductDetailOverlay({ productId, onClose }: Props) {
  const [product, setProduct] = useState<FullProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);

  const discount = product?.discounts?.[0];
  const discountedPrice = product
    ? discount
      ? Math.round(product.price * (1 - discount.percent / 100))
      : product.price
    : 0;
  const originalPrice = product && discount ? product.price : null;
  const savings = originalPrice ? originalPrice - discountedPrice : 0;

  const countdown = useCountdown(discount?.validUntil);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    fetch(`${API}/products/${productId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setProduct(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId]);

  const images = product?.images ?? [];
  const isOutOfStock = product?.stock === 0;

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#f4f4f4] w-full md:max-w-6xl rounded-t-3xl md:rounded-3xl overflow-hidden max-h-[95vh] md:max-h-[90vh] flex flex-col shadow-2xl"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100 shrink-0">
          <nav className="text-sm text-slate-500 flex items-center gap-1.5 truncate">
            <Link href="/" className="hover:text-slate-700 transition-colors shrink-0">
              Нүүр хуудас
            </Link>
            <span className="shrink-0">•</span>
            <span className="text-slate-900 font-medium line-clamp-1">
              {product?.name ?? "Уншиж байна..."}
            </span>
          </nav>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0 ml-3"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-72">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !product ? (
            <div className="flex flex-col items-center justify-center h-72 gap-3 text-slate-400">
              <Package className="w-14 h-14 opacity-30" />
              <p className="font-medium">Бараа олдсонгүй</p>
            </div>
          ) : (
            <div className="p-4 md:p-6 flex flex-col md:grid md:grid-cols-[64px_1fr_1fr_280px] gap-4 md:gap-5">

              {/* Col 1: Thumbnail strip (desktop only) */}
              {images.length > 1 && (
                <div className="hidden md:flex flex-col gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImg(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        idx === activeImg
                          ? "border-orange-500 shadow-md"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <Image
                        src={img.url}
                        alt=""
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Col 2: Main image */}
              <div className="bg-white rounded-2xl overflow-hidden relative aspect-square md:aspect-auto md:min-h-[380px]">
                {images.length > 0 ? (
                  <Image
                    src={images[activeImg]?.url ?? images[0].url}
                    alt={product.name}
                    fill
                    className="object-contain p-6"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200">
                    <Package className="w-24 h-24" />
                  </div>
                )}
                {/* Mobile image nav */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImg((prev) => Math.max(0, prev - 1))}
                      disabled={activeImg === 0}
                      className="md:hidden absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 text-white rounded-full flex items-center justify-center disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveImg((prev) => Math.min(images.length - 1, prev + 1))}
                      disabled={activeImg === images.length - 1}
                      className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 text-white rounded-full flex items-center justify-center disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    {/* Mobile dot indicator */}
                    <div className="md:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImg(idx)}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            idx === activeImg ? "bg-orange-500" : "bg-slate-300"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Col 3: Product info */}
              <div className="flex flex-col gap-4">
                {/* Store card */}
                <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                    {product.organization.logoUrl ? (
                      <Image
                        src={product.organization.logoUrl}
                        alt={product.organization.name}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Store className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-sm truncate">
                      {product.organization.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {product.organization.name} · Дэлгүүр
                    </p>
                    {product.stock != null && product.stock > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-xs text-emerald-600 font-medium">
                          {product.stock} ширхэг
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Discount + title + description */}
                <div className="bg-white rounded-2xl p-5 shadow-sm flex-1">
                  {discount && (
                    <span className="inline-block bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
                      -{discount.percent}%
                    </span>
                  )}
                  <h1 className="text-base font-bold text-slate-900 leading-snug mb-4">
                    {product.name}
                  </h1>
                  {product.description ? (
                    <>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Дэлгэрэнгүй мэдээлэл
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {product.description}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      Дэлгэрэнгүй мэдээлэл байхгүй байна.
                    </p>
                  )}
                  {product.sku && (
                    <p className="text-xs text-slate-400 mt-4">
                      SKU: <span className="font-mono">{product.sku}</span>
                    </p>
                  )}
                  {product.businessCategory && (
                    <p className="text-xs text-slate-400 mt-1">
                      Ангилал:{" "}
                      <span className="font-medium text-slate-600">
                        {product.businessCategory.name}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Col 4: Price + buy panel */}
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  {/* Price */}
                  <div className="flex items-baseline gap-3 flex-wrap mb-1">
                    <span className="text-2xl font-extrabold text-red-600">
                      {formatPrice(discountedPrice)}
                    </span>
                    {originalPrice && (
                      <span className="text-base text-slate-400 line-through">
                        {formatPrice(originalPrice)}
                      </span>
                    )}
                  </div>
                  {savings > 0 && (
                    <p className="text-sm font-semibold text-emerald-600 mb-3">
                      Хэмнэлт: {formatPrice(savings)}
                    </p>
                  )}
                  {product.stock != null && (
                    <p className="text-sm text-slate-600 mb-4">
                      Үлдэгдэл:{" "}
                      <span className="font-bold text-slate-900">{product.stock}</span>
                    </p>
                  )}

                  {/* Countdown timer */}
                  {discount?.validUntil && (
                    <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Хямдрал дуусахад
                      </p>
                      <div className="grid grid-cols-4 gap-1 text-center">
                        {(
                          [
                            { val: countdown.d, label: "өдөр" },
                            { val: countdown.h, label: "цаг" },
                            { val: countdown.m, label: "мин" },
                            { val: countdown.s, label: "сек" },
                          ] as const
                        ).map(({ val, label }) => (
                          <div key={label} className="flex flex-col items-center">
                            <span className="text-xl font-extrabold text-slate-900 leading-none tabular-nums">
                              {String(val).padStart(2, "0")}
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <button
                      disabled={isOutOfStock}
                      onClick={() => {
                        if (!isOutOfStock && product) {
                          addToCart({
                            id: product.id,
                            name: product.name,
                            price: discountedPrice,
                            image: product.images[0]?.url,
                            quantity: 1,
                          });
                        }
                      }}
                      className={`flex-1 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm text-sm ${
                        isOutOfStock
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                          : "bg-[#28a745] hover:bg-[#218838] text-white shadow-green-600/20"
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {isOutOfStock ? "Нөөц дууссан" : "Сагслах"}
                    </button>
                    <button
                      onClick={() => setWishlisted((w) => !w)}
                      className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all active:scale-[0.98] ${
                        wishlisted
                          ? "border-red-300 bg-red-50 text-red-500"
                          : "border-slate-200 bg-white text-slate-400 hover:text-red-400 hover:border-red-200"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${wishlisted ? "fill-red-500" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* FAQ */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Түгээмэл асуултууд
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {FAQ_ITEMS.map((q) => (
                      <button
                        key={q}
                        className="w-full text-left text-sm text-slate-500 hover:text-orange-600 transition-colors leading-snug"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
