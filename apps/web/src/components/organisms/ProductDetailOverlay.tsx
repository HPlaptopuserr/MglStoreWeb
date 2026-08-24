"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingCart,
  Store,
  Package,
  HelpCircle,
  Shield,
  Truck,
  RotateCcw,
  Star,
  Minus,
  Plus,
  Share2,
} from "lucide-react";
import { API } from "@/lib/api";
import { addToCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth-context";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import {
  resolveMarketplacePricingAudience,
  resolveMemberPricing,
} from "@/lib/member-pricing";
import { organizationPath } from "@/lib/organization-links";
import {
  findLocalCatalogProduct,
  LOCAL_MOCK_CATALOG_ENABLED,
} from "@/lib/local-product-catalog";

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
  supplyType?: "IN_STOCK" | "CHINA_PREORDER";
  preorderLeadTimeDays?: number | null;
  preorderCapacity?: number | null;
  preorderParticipantCount?: number;
  preorderRemaining?: number | null;
  preorderIsFull?: boolean;
  preorderNote?: string | null;
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

export function ProductDetailOverlay({ productId, onClose }: Props) {
  const { user } = useAuth();
  const [product, setProduct] = useState<FullProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [imgZoom, setImgZoom] = useState(false);

  const discount = product?.discounts?.[0];
  const pricingAudience = resolveMarketplacePricingAudience(user);
  const pricing = product
    ? resolveMemberPricing(
        product.price,
        product.discounts,
        pricingAudience,
        product.supplyType,
      )
    : resolveMemberPricing(0, [], pricingAudience);
  const discountedPrice = pricing.price;
  const originalPrice = pricing.originalPrice;
  const savings = pricing.savings;
  const countdown = useCountdown(discount?.validUntil);

  useLockBodyScroll();

  useEffect(() => {
    const localProduct = LOCAL_MOCK_CATALOG_ENABLED
      ? findLocalCatalogProduct(productId)
      : null;
    if (localProduct) {
      Promise.resolve().then(() => {
        setProduct({
          ...localProduct,
          discounts: localProduct.discounts.map((discount) => ({
            ...discount,
            validUntil: "2027-12-31T23:59:59.000Z",
          })),
        });
        setLoading(false);
      });
      return;
    }

    fetch(`${API}/products/${productId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setProduct(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId]);

  const images = product?.images ?? [];
  const isPreorder = product?.supplyType === "CHINA_PREORDER";
  const isOutOfStock = !isPreorder && product?.stock === 0;
  const isPreorderFull = Boolean(isPreorder && product?.preorderIsFull);
  const unavailable = isOutOfStock || isPreorderFull;
  const maxQty = Math.min(isPreorder ? 99 : (product?.stock ?? 99), 99);

  const handleAddToCart = useCallback(() => {
    if (!product || unavailable) return;
    addToCart({
      id: product.id,
      name: product.name,
      price: discountedPrice,
      basePrice: Number(product.price),
      originalPrice,
      memberDiscountPercent: pricing.active ? pricing.percent : null,
      discountLabel: pricing.label,
      supplyType: product.supplyType,
      image: images[0]?.url,
      quantity,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }, [
    product,
    unavailable,
    discountedPrice,
    originalPrice,
    pricing.active,
    pricing.percent,
    pricing.label,
    images,
    quantity,
  ]);

  const handleShare = useCallback(async () => {
    if (!product) return;
    const url = `${window.location.origin}/products/${product.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [product]);

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-[6px] flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 80, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 80, scale: 0.97 }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full md:max-w-[960px] rounded-t-[28px] md:rounded-[24px] overflow-hidden max-h-[96vh] md:max-h-[92vh] flex flex-col shadow-[0_25px_60px_-12px_rgba(0,0,0,0.35)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 md:px-6 py-3.5 border-b border-gray-100 shrink-0">
          <nav className="text-[13px] text-gray-400 flex items-center gap-2 truncate">
            <Link href="/" className="hover:text-gray-600 transition-colors">
              Нүүр хуудас
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-800 font-medium line-clamp-1">
              {product?.name ?? "Уншиж байна..."}
            </span>
          </nav>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors shrink-0 ml-3"
          >
            <X className="w-[18px] h-[18px] text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center h-80">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Уншиж байна...</p>
              </div>
            </div>
          ) : !product ? (
            <div className="flex flex-col items-center justify-center h-80 gap-3 text-gray-300">
              <Package className="w-16 h-16" />
              <p className="font-medium text-gray-400">Бараа олдсонгүй</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row">
              {/* ═══ LEFT: Image Gallery ═══ */}
              <div className="md:w-[440px] shrink-0 bg-gray-50/60 p-4 md:p-5">
                {/* Main Image */}
                <div
                  className="relative bg-white rounded-2xl overflow-hidden aspect-square cursor-zoom-in group"
                  onClick={() => images.length > 0 && setImgZoom(!imgZoom)}
                >
                  {images.length > 0 ? (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeImg}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0"
                      >
                        <Image
                          src={images[activeImg]?.url ?? images[0].url}
                          alt={product.name}
                          fill
                          className={`object-contain transition-transform duration-300 ${imgZoom ? "scale-150" : "scale-[0.85] group-hover:scale-[0.9]"}`}
                          referrerPolicy="no-referrer"
                          sizes="440px"
                          priority
                        />
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-20 h-20 text-gray-200" />
                    </div>
                  )}

                  {/* Discount badge */}
                  {discount && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                      -{discount.percent}%
                    </div>
                  )}

                  {/* Image nav arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImg((p) => Math.max(0, p - 1));
                        }}
                        disabled={activeImg === 0}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white text-gray-600 rounded-full flex items-center justify-center disabled:opacity-0 transition-all shadow-sm backdrop-blur-sm"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImg((p) =>
                            Math.min(images.length - 1, p + 1),
                          );
                        }}
                        disabled={activeImg === images.length - 1}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white text-gray-600 rounded-full flex items-center justify-center disabled:opacity-0 transition-all shadow-sm backdrop-blur-sm"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnail strip */}
                {images.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                    {images.map((img, idx) => (
                      <button
                        key={img.id}
                        onClick={() => setActiveImg(idx)}
                        className={`relative w-[60px] h-[60px] rounded-xl overflow-hidden shrink-0 transition-all ring-2 ring-offset-1 ${
                          idx === activeImg
                            ? "ring-orange-500 shadow-md"
                            : "ring-transparent hover:ring-gray-300"
                        }`}
                      >
                        <Image
                          src={img.url}
                          alt=""
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                          sizes="60px"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Image counter */}
                {images.length > 1 && (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    {activeImg + 1} / {images.length}
                  </p>
                )}
              </div>

              {/* ═══ RIGHT: Product Info ═══ */}
              <div className="flex-1 min-w-0 p-5 md:p-6 flex flex-col">
                {/* Category & SKU */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {product.businessCategory && (
                    <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full">
                      {product.businessCategory.name}
                    </span>
                  )}
                  {product.sku && (
                    <span className="text-xs text-gray-400 font-mono">
                      SKU: {product.sku}
                    </span>
                  )}
                </div>

                {/* Product name */}
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight mb-3">
                  {product.name}
                </h1>

                {/* Rating placeholder */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className="w-3.5 h-3.5 fill-orange-400 text-orange-400"
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">5.0</span>
                </div>

                {/* Price section */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50/50 rounded-2xl p-4 mb-4 border border-orange-100/60">
                  <div className="flex items-end gap-3 flex-wrap">
                    <span className="text-3xl font-extrabold text-orange-600 tracking-tight">
                      {formatPrice(discountedPrice)}
                    </span>
                    {originalPrice && (
                      <span className="text-base text-gray-400 line-through mb-0.5">
                        {formatPrice(originalPrice)}
                      </span>
                    )}
                  </div>
                  {savings > 0 && (
                    <p className="text-sm font-semibold text-green-600 mt-1">
                      {formatPrice(savings)} хэмнэнэ
                    </p>
                  )}

                  {/* Countdown */}
                  {!isPreorder && discount?.validUntil && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-orange-100/80">
                      <span className="text-[11px] text-gray-500 font-medium shrink-0">
                        {pricing.active
                          ? `${pricing.label} хөнгөлөлт дуусахад:`
                          : `Гишүүн бол -${discount.percent}%:`}
                      </span>
                      <div className="flex gap-1">
                        {(
                          [
                            { val: countdown.d, label: "Ө" },
                            { val: countdown.h, label: "Ц" },
                            { val: countdown.m, label: "М" },
                            { val: countdown.s, label: "С" },
                          ] as const
                        ).map(({ val, label }) => (
                          <div
                            key={label}
                            className="bg-gray-900 text-white text-xs font-bold px-1.5 py-1 rounded-md min-w-[32px] text-center tabular-nums"
                          >
                            {String(val).padStart(2, "0")}
                            <span className="text-[9px] text-gray-400 ml-0.5">
                              {label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stock indicator */}
                {isPreorder ? (
                  <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                    <p className="font-bold">Захиалгаар</p>
                    <p className="mt-1">
                      Ирэх хугацаа: {product.preorderLeadTimeDays ?? 14} хоног
                    </p>
                    {product.preorderCapacity && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>
                            {product.preorderParticipantCount ?? 0}/
                            {product.preorderCapacity} хүн
                          </span>
                          <span>
                            {product.preorderIsFull
                              ? "Дүүрсэн"
                              : `${product.preorderRemaining ?? Math.max(0, product.preorderCapacity - (product.preorderParticipantCount ?? 0))} хүн дутуу`}
                          </span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                          <div
                            className={`h-full rounded-full ${product.preorderIsFull ? "bg-slate-700" : "bg-blue-500"}`}
                            style={{
                              width: `${Math.min(100, ((product.preorderParticipantCount ?? 0) / product.preorderCapacity) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {product.preorderNote && (
                      <p className="mt-1 text-blue-700">
                        {product.preorderNote}
                      </p>
                    )}
                  </div>
                ) : (
                  product.stock != null && (
                    <div className="flex items-center gap-2 mb-4">
                      <div
                        className={`w-2 h-2 rounded-full ${product.stock > 0 ? "bg-green-500" : "bg-red-500"}`}
                      />
                      <span
                        className={`text-sm font-medium ${product.stock > 0 ? "text-green-700" : "text-red-600"}`}
                      >
                        {product.stock > 0
                          ? `Нөөцөд ${product.stock} ширхэг байна`
                          : "Нөөц дууссан"}
                      </span>
                    </div>
                  )
                )}

                {/* Quantity + Cart */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30"
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="w-10 h-10 flex items-center justify-center text-sm font-bold text-gray-900 border-x border-gray-200 tabular-nums">
                      {quantity}
                    </span>
                    <button
                      onClick={() =>
                        setQuantity((q) => Math.min(maxQty, q + 1))
                      }
                      disabled={quantity >= maxQty}
                      className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  <button
                    disabled={unavailable}
                    onClick={handleAddToCart}
                    className={`flex-1 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-sm h-10 ${
                      addedToCart
                        ? "bg-green-500 text-white"
                        : unavailable
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20"
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {addedToCart
                      ? "Нэмэгдлээ!"
                      : unavailable
                        ? isPreorder
                          ? "Захиалга дүүрсэн"
                          : "Нөөц дууссан"
                        : isPreorder
                          ? "Захиалах"
                          : "Сагсанд нэмэх"}
                  </button>

                  <button
                    onClick={() => setWishlisted((w) => !w)}
                    className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                      wishlisted
                        ? "border-red-200 bg-red-50 text-red-500"
                        : "border-gray-200 text-gray-400 hover:text-red-400 hover:border-red-200"
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${wishlisted ? "fill-red-500" : ""}`}
                    />
                  </button>

                  <button
                    onClick={handleShare}
                    className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all active:scale-95 shrink-0"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    { icon: Truck, label: "Хүргэлттэй", sub: "Улаанбаатар" },
                    {
                      icon: Shield,
                      label: "Баталгаатай",
                      sub: "Чанарын баталгаа",
                    },
                    {
                      icon: RotateCcw,
                      label: "Буцаалт",
                      sub: "7 хоногийн дотор",
                    },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center text-center py-2.5 bg-gray-50 rounded-xl"
                    >
                      <Icon className="w-4 h-4 text-gray-500 mb-1" />
                      <p className="text-[11px] font-semibold text-gray-700">
                        {label}
                      </p>
                      <p className="text-[10px] text-gray-400">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Store info */}
                <Link
                  href={organizationPath(product.organization)}
                  className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 rounded-xl p-3 transition-colors mb-4 group"
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white border border-gray-200 shrink-0">
                    {product.organization.logoUrl ? (
                      <Image
                        src={product.organization.logoUrl}
                        alt={product.organization.name}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                        sizes="40px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Store className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                      {product.organization.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      Дэлгүүр рүү зочлох →
                    </p>
                  </div>
                </Link>

                {/* Description */}
                {product.description && (
                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Тайлбар
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* FAQ */}
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Түгээмэл асуултууд
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      "Бөөндүй – Дараа төлөх нөхцөл",
                      "Захиалгын зөрүү төлбөрийг хэрхэн данс руугаа татах вэ?",
                      "Захиалгын явцыг хэрхэн харах вэ?",
                    ].map((q) => (
                      <button
                        key={q}
                        className="w-full text-left text-[13px] text-gray-500 hover:text-orange-600 transition-colors py-1.5 pl-3 border-l-2 border-transparent hover:border-orange-400"
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
