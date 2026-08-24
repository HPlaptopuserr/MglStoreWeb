"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type {
  OrganizationDetailData,
  OrganizationReel,
  ServicePost,
} from "./page";
import {
  Star,
  MapPin,
  Clock,
  Truck,
  Phone,
  MessageCircle,
  ShoppingBag,
  Search,
  ShoppingCart,
  ShieldCheck,
  Users,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Crown,
  Megaphone,
  Tag,
  Eye,
  ArrowLeft,
  Zap,
  CheckCircle2,
  Heart,
  Play,
  QrCode,
  Video,
  LoaderCircle,
} from "lucide-react";
import {
  getServicePostCategories,
  QrGenerator,
  useInfiniteScroll,
} from "@mgl/ui";
import { getInvestorTierLabel } from "@mgl/types";
import { resolveApiAssetUrl } from "@/lib/api";
import { InvestorRingWrapper } from "@/components/atoms/InvestorRingWrapper";
import { ServiceDetailOverlay } from "@/app/services/_components/ServiceDetailOverlay";
import { formatOrganizationRating } from "@/lib/organization-presentation";
import { StorefrontProductCard } from "./_components/StorefrontProductCard";
import { StoreUtilityBar } from "@/components/organisms/layouts/StoreUtilityBar";
import { useAuth } from "@/lib/auth-context";
import {
  resolveMarketplacePricingAudience,
  resolveMemberPricing,
} from "@/lib/member-pricing";

type ProductItem = OrganizationDetailData["products"][number] & {
  isAvailable?: boolean;
};

type ContentFilter = "all" | "products" | "services" | "reels";

const STOREFRONT_CONTAINER_CLASS =
  "mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-8";
const STOREFRONT_PAGE_SIZE = 20;

function formatPrice(price: number | undefined) {
  if (typeof price !== "number" || Number.isNaN(price)) return "—";
  return `${price.toLocaleString("en-US")}₮`;
}

function formatCompactCount(value?: number) {
  const next = Number(value || 0);
  if (next >= 1_000_000) return `${Math.round(next / 100_000) / 10}M`;
  if (next >= 1_000) return `${Math.round(next / 100) / 10}K`;
  return String(next);
}

function getItemTime(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getReelTitle(reel: OrganizationReel, index?: number) {
  return (
    reel.title ||
    reel.caption ||
    reel.product?.name ||
    (typeof index === "number" ? `Reel #${index + 1}` : "Reel")
  );
}

function ReelCard({
  reel,
  index,
  compact = false,
}: {
  reel: OrganizationReel;
  index?: number;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const title = getReelTitle(reel, index);
  const productImage = reel.product?.images?.[0]?.url || null;
  const preview = resolveApiAssetUrl(reel.thumbnailUrl || productImage);
  const video = resolveApiAssetUrl(reel.videoUrl);
  const reelHref = `/reels?reel=${encodeURIComponent(reel.id)}&returnTo=${encodeURIComponent(pathname || "/organizations")}`;

  return (
    <Link
      href={reelHref}
      className="group block overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div
        className={`relative overflow-hidden bg-slate-950 ${
          compact ? "aspect-[4/3]" : "aspect-[9/14]"
        }`}
      >
        {preview ? (
          <Image
            src={preview}
            alt={title}
            fill
            className="object-cover opacity-95 transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : video ? (
          <video
            src={video}
            className="h-full w-full object-cover opacity-95 transition-transform duration-500 group-hover:scale-105"
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-800 to-rose-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
          Reel
        </span>
        <div className="absolute bottom-3 left-3 right-3">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md ring-1 ring-white/25 transition-transform group-hover:scale-105">
            <Play className="h-4 w-4 fill-current" />
          </div>
          {reel.product?.name && !compact && (
            <span className="mb-2 inline-flex max-w-full rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-900">
              <span className="truncate">{reel.product.name}</span>
            </span>
          )}
          <h3 className="line-clamp-2 text-sm font-extrabold leading-tight text-white">
            {title}
          </h3>
          <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-white/80">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {formatCompactCount(reel.viewCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {formatCompactCount(reel.likeCount)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Hero ─────────────────────────────────────────────────── */
function HeroSection({ data }: { data: OrganizationDetailData }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full"
    >
      {/* Cover */}
      <div className="relative w-full h-[240px] sm:h-[320px] lg:h-[400px] rounded-3xl overflow-hidden">
        <Image
          src={data.coverImage}
          alt={data.name}
          fill
          priority
          className="object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Back button */}
        <Link
          href="/organizations"
          className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-sm font-semibold px-3 py-2 rounded-full transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Буцах</span>
        </Link>
      </div>

      {/* Profile card overlapping the cover */}
      <div className="relative -mt-16 sm:-mt-20 mx-4 sm:mx-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-100 p-5 sm:p-7"
        >
          <div className="flex items-start gap-4 sm:gap-6">
            {/* Logo */}
            <InvestorRingWrapper
              investmentAmount={data.investor?.investmentAmount}
              rounded="xl"
            >
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-[1.25rem] overflow-hidden bg-slate-50 shadow-lg">
                <Image
                  src={data.logo}
                  alt={data.name}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
                {data.isOpen && (
                  <span className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow" />
                )}
              </div>
            </InvestorRingWrapper>

            {/* Name & meta */}
            <div className="flex-1 min-w-0 pt-1">
              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {data.isOpen && (
                  <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Нээлттэй
                  </span>
                )}
                {data.isVerified && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-100">
                    <ShieldCheck className="w-3 h-3" />
                    Баталгаат
                  </span>
                )}
                {data.investor?.isInvestor && (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-200">
                    <Crown className="w-3 h-3" />
                    {data.investor.level ||
                      getInvestorTierLabel(data.investor.tier)}
                  </span>
                )}
                {data.categories.map((cat, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center bg-slate-100 text-slate-600 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                  >
                    {cat}
                  </span>
                ))}
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight truncate">
                {data.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-bold text-slate-900">
                    {data.rating}
                  </span>
                  <span className="text-sm text-slate-400">
                    ({data.reviewCount})
                  </span>
                </div>
                {data.isOpen && (
                  <span className="text-sm text-emerald-600 font-medium">
                    Яг одоо идэвхтэй
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm text-slate-500 leading-relaxed line-clamp-2 hidden sm:block">
                {data.shortDescription}
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-500 leading-relaxed sm:hidden">
            {data.shortDescription}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Stats strip ───────────────────────────────────────────── */
function StatsStrip({
  stats,
  isVerified,
}: {
  stats: OrganizationDetailData["stats"];
  isVerified: boolean;
}) {
  const items = [
    {
      icon: <ShieldCheck className="w-5 h-5 text-blue-500" />,
      value: "Баталгаат",
      label: "Албан ёсны",
      bg: "bg-blue-50",
    },
    {
      icon: <Users className="w-5 h-5 text-violet-500" />,
      value: stats.customers,
      label: "Харилцагч",
      bg: "bg-violet-50",
    },
    {
      icon: <CalendarDays className="w-5 h-5 text-orange-500" />,
      value: `${stats.years} жил`,
      label: "Туршлагатай",
      bg: "bg-orange-50",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="grid grid-cols-3 gap-3 mt-4"
    >
      {items.map((item, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 flex flex-col items-center gap-2 shadow-sm text-center"
        >
          <div
            className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center`}
          >
            {item.icon}
          </div>
          <div>
            <p className="text-sm font-extrabold text-slate-900 leading-none">
              {item.value}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {item.label}
            </p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

/* ─── About ─────────────────────────────────────────────────── */
function AboutSection({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 200;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-7"
    >
      <h2 className="text-base font-bold text-slate-900 mb-3">Бидний тухай</h2>
      <p
        className={`text-sm text-slate-600 leading-relaxed ${
          !expanded && isLong ? "line-clamp-3" : ""
        }`}
      >
        {text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((p) => !p)}
          className="mt-3 flex items-center gap-1 text-orange-500 text-sm font-semibold hover:text-orange-600 transition-colors"
        >
          {expanded ? "Хураах" : "Дэлгэрэнгүй"}
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      )}
    </motion.div>
  );
}

/* ─── Info cards ────────────────────────────────────────────── */
function InfoCards({ info }: { info: OrganizationDetailData["info"] }) {
  const cards = [
    info.hours?.length && {
      icon: <Clock className="w-5 h-5" />,
      color: "text-orange-500 bg-orange-50",
      title: "Цагийн хуваарь",
      content: info.hours.join(" · "),
    },
    info.delivery && {
      icon: <Truck className="w-5 h-5" />,
      color: "text-blue-500 bg-blue-50",
      title: "Хүргэлт",
      content: [info.delivery.text, info.delivery.price]
        .filter(Boolean)
        .join(" — "),
    },
    info.location && {
      icon: <MapPin className="w-5 h-5" />,
      color: "text-emerald-500 bg-emerald-50",
      title: "Хаяг",
      content: info.location,
    },
  ].filter(Boolean) as {
    icon: React.ReactNode;
    color: string;
    title: string;
    content: string;
  }[];

  if (!cards.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-1 sm:grid-cols-3 gap-3"
    >
      {cards.map((card, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-3 hover:shadow-md transition-shadow"
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}
          >
            {card.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {card.title}
            </p>
            <p className="text-sm font-semibold text-slate-800 leading-snug">
              {card.content}
            </p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

/* ─── Content summary ───────────────────────────────────────── */
function ContentSummary({
  data,
  active,
  onChange,
}: {
  data: OrganizationDetailData;
  active: ContentFilter;
  onChange: (filter: ContentFilter) => void;
}) {
  const total =
    data.products.length + data.servicePosts.length + data.reels.length;
  const items = [
    {
      key: "all" as const,
      label: "Бүх",
      value: total,
      icon: <ShoppingBag className="w-4 h-4" />,
      color: "bg-slate-100 text-slate-700",
      activeColor: "bg-slate-900 text-white",
    },
    {
      key: "products" as const,
      label: "Бүтээгдэхүүн",
      value: data.products.length,
      icon: <ShoppingBag className="w-4 h-4" />,
      color: "bg-orange-50 text-orange-600",
      activeColor: "bg-orange-500 text-white",
    },
    {
      key: "services" as const,
      label: "Үйлчилгээ",
      value: data.servicePosts.length,
      icon: <Megaphone className="w-4 h-4" />,
      color: "bg-purple-50 text-purple-600",
      activeColor: "bg-purple-500 text-white",
    },
    {
      key: "reels" as const,
      label: "Reels",
      value: data.reels.length,
      icon: <Video className="w-4 h-4" />,
      color: "bg-rose-50 text-rose-600",
      activeColor: "bg-rose-500 text-white",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="grid grid-cols-2 gap-2 rounded-3xl border border-slate-100 bg-white p-2 shadow-sm sm:grid-cols-4 sm:gap-3 sm:p-3"
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          aria-pressed={active === item.key}
          className={`flex min-w-0 items-center gap-2 rounded-2xl px-3 py-3 text-left transition-all sm:px-4 ${
            active === item.key
              ? "bg-slate-900 shadow-lg shadow-slate-900/10"
              : "bg-slate-50/80 hover:bg-white hover:shadow-md"
          }`}
        >
          <div
            className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex ${
              active === item.key ? item.activeColor : item.color
            }`}
          >
            {item.icon}
          </div>
          <div className="min-w-0">
            <p
              className={`text-base font-extrabold leading-none ${
                active === item.key ? "text-white" : "text-slate-900"
              }`}
            >
              {item.value}
            </p>
            <p
              className={`mt-1 truncate text-[11px] font-bold ${
                active === item.key ? "text-white/70" : "text-slate-400"
              }`}
            >
              {item.label}
            </p>
          </div>
        </button>
      ))}
    </motion.div>
  );
}

/* ─── Services ──────────────────────────────────────────────── */
function ServicesSection({ posts }: { posts: ServicePost[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!posts.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
          <Megaphone className="w-4 h-4" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Үйлчилгээ</h2>
        <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
          {posts.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => {
          const thumb = post.images?.[0]?.url;
          const categories = getServicePostCategories(post.tags);
          return (
            <motion.button
              key={post.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedId(post.id)}
              className="group text-left bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg transition-all"
            >
              <div className="relative w-full aspect-video bg-purple-50 overflow-hidden">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Megaphone className="w-10 h-10 text-purple-200" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug mb-1.5">
                  {post.title}
                </h3>
                {post.priceText && (
                  <p className="text-base font-extrabold text-orange-500 mb-1.5">
                    {post.priceText}
                  </p>
                )}
                {post.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                    {post.description}
                  </p>
                )}
                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {categories.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {selectedId && (
        <ServiceDetailOverlay
          postId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </motion.div>
  );
}

/* ─── Reels ─────────────────────────────────────────────────── */
function ReelsSection({ reels }: { reels: OrganizationReel[] }) {
  if (!reels.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.52 }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
          <Video className="w-4 h-4" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Reels</h2>
        <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
          {reels.length}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {reels.map((reel, index) => (
          <motion.div
            key={reel.id}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <ReelCard reel={reel} index={index} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Unified feed ──────────────────────────────────────────── */
function UnifiedContentSection({
  data,
  hasOtherContent,
}: {
  data: OrganizationDetailData;
  hasOtherContent?: boolean;
}) {
  const { user } = useAuth();
  const pricingAudience = resolveMarketplacePricingAudience(user);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );

  const items = useMemo(() => {
    const products = (data.products as ProductItem[]).map((product) => ({
      type: "product" as const,
      id: product.id,
      createdAt: product.createdAt,
      product,
    }));
    const services = data.servicePosts.map((post) => ({
      type: "service" as const,
      id: post.id,
      createdAt: post.createdAt,
      post,
    }));
    const reels = data.reels.map((reel) => ({
      type: "reel" as const,
      id: reel.id,
      createdAt: reel.publishedAt || reel.createdAt,
      reel,
    }));

    return [...products, ...services, ...reels].sort(
      (a, b) => getItemTime(b.createdAt) - getItemTime(a.createdAt),
    );
  }, [data.products, data.servicePosts, data.reels]);

  if (!items.length) {
    return (
      <ProductsSection
        products={data.products as ProductItem[]}
        hasOtherContent={hasOtherContent}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
          <ShoppingBag className="h-4 w-4" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Бүх контент</h2>
        <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-400">
          {items.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          if (item.type === "product") {
            const product = item.product;
            const image = resolveApiAssetUrl(product.image);
            const pricing = resolveMemberPricing(
              product.price,
              null,
              pricingAudience,
              product.supplyType,
            );
            return (
              <Link
                key={`product-${item.id}`}
                href={`/products/${encodeURIComponent(product.id)}`}
                className="group overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-orange-50">
                  <Image
                    src={image}
                    alt={product.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold text-white">
                    Бүтээгдэхүүн
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">
                    {product.title}
                  </h3>
                  <p className="mt-2 text-base font-extrabold text-orange-500">
                    {formatPrice(pricing.price)}
                  </p>
                  {pricing.label && (
                    <p className="mt-1 text-xs font-bold text-emerald-600">
                      {pricing.label}
                    </p>
                  )}
                </div>
              </Link>
            );
          }

          if (item.type === "service") {
            const post = item.post;
            const thumb = resolveApiAssetUrl(post.images?.[0]?.url);
            return (
              <button
                key={`service-${item.id}`}
                type="button"
                onClick={() => setSelectedServiceId(post.id)}
                className="group overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-purple-50">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Megaphone className="h-10 w-10 text-purple-200" />
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-purple-500 px-2.5 py-1 text-[10px] font-bold text-white">
                    Үйлчилгээ
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">
                    {post.title}
                  </h3>
                  {post.priceText && (
                    <p className="mt-2 text-base font-extrabold text-orange-500">
                      {post.priceText}
                    </p>
                  )}
                  {post.description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                      {post.description}
                    </p>
                  )}
                </div>
              </button>
            );
          }

          return (
            <motion.div
              key={`reel-${item.id}`}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <ReelCard reel={item.reel} compact />
            </motion.div>
          );
        })}
      </div>

      {selectedServiceId && (
        <ServiceDetailOverlay
          postId={selectedServiceId}
          onClose={() => setSelectedServiceId(null)}
        />
      )}
    </motion.div>
  );
}

/* ─── Products ──────────────────────────────────────────────── */
function ProductsSection({
  products,
  hasOtherContent,
}: {
  products: ProductItem[];
  hasOtherContent?: boolean;
}) {
  const { user } = useAuth();
  const pricingAudience = resolveMarketplacePricingAudience(user);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      products.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, search],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Бүтээгдэхүүн</h2>
          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {products.length}
          </span>
        </div>
        {products.length > 0 && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Бараа хайх..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all w-full sm:w-60 shadow-sm"
            />
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0">
                <ShoppingBag className="w-7 h-7 text-orange-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {products.length === 0
                    ? "Бүтээгдэхүүн хараахан нэмэгдээгүй"
                    : "Хайлтад тохирохгүй"}
                </h3>
                <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                  {products.length === 0
                    ? hasOtherContent
                      ? "Энэ байгууллагын үйлчилгээ болон reels контентуудыг үзээд шууд холбогдох боломжтой."
                      : "Байгууллага product нэмэх үед энд шууд карт хэлбэрээр харагдана."
                    : "Өөр үгээр хайж үзнэ үү."}
                </p>
              </div>
            </div>
            {products.length === 0 && (
              <Link
                href="/organizations"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
              >
                Бусад дэлгүүр үзэх
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map((product) => {
            const isPreorder = product.supplyType === "CHINA_PREORDER";
            const pricing = resolveMemberPricing(
              product.price,
              null,
              pricingAudience,
              product.supplyType,
            );
            const available = isPreorder
              ? !product.preorderIsFull
              : typeof product.stock === "number"
                ? product.stock > 0
                : true;
            const preorderLabel = product.preorderLeadTimeDays
              ? `${product.preorderLeadTimeDays} хоног`
              : "Захиалгаар";
            return (
              <motion.div
                key={product.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg transition-all"
              >
                <Link
                  href={`/products/${encodeURIComponent(product.id)}`}
                  className="block cursor-pointer text-left"
                >
                  <div className="relative w-full aspect-square bg-slate-50 overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    {isPreorder && (
                      <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                        {preorderLabel}
                      </span>
                    )}
                    {!available && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-full">
                          Дууссан
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                    </div>
                  </div>
                  <div className="p-3">
                    {product.category && (
                      <p className="text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">
                        {product.category}
                      </p>
                    )}
                    <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug mb-2">
                      {product.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-orange-500">
                        {formatPrice(pricing.price)}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          available
                            ? "bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white"
                            : "bg-slate-100 text-slate-300 cursor-not-allowed"
                        }`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    {pricing.label && (
                      <p className="mt-1 text-[10px] font-bold text-emerald-600">
                        {pricing.label}
                      </p>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Desktop sidebar ───────────────────────────────────────── */
function Sidebar({ data }: { data: OrganizationDetailData }) {
  const hasProducts = data.products.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="sticky top-24 space-y-4"
    >
      {/* CTA */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
        {hasProducts ? (
          <button className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold py-4 px-5 rounded-2xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2.5 text-base">
            <ShoppingBag className="w-5 h-5" />
            Захиалга өгөх
          </button>
        ) : data.info.phone ? (
          <a
            href={`tel:${data.info.phone}`}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold py-4 px-5 rounded-2xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2.5 text-base"
          >
            <Phone className="w-5 h-5" />
            Холбоо барих
          </a>
        ) : (
          <button className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold py-4 px-5 rounded-2xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2.5 text-base">
            <Phone className="w-5 h-5" />
            Холбоо барих
          </button>
        )}

        {hasProducts && data.info.phone && (
          <a
            href={`tel:${data.info.phone}`}
            className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold py-3 px-5 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
          >
            <Phone className="w-4 h-4" />
            Утсаар холбогдох
          </a>
        )}

        <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold py-3 px-5 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.98]">
          <MessageCircle className="w-4 h-4" />
          Чат
        </button>

        <div className="flex items-center gap-2 pt-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-xs text-slate-500 font-medium">
            {hasProducts
              ? "Өнөөдөр захиалбал хүргэнэ"
              : "5 мин дотор хариу өгнө"}
          </p>
        </div>
      </div>

      {/* Promo */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 p-5 text-white shadow-lg shadow-orange-500/20">
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-6 -bottom-6 w-28 h-28 bg-black/10 rounded-full blur-xl pointer-events-none" />
        <div className="relative z-10">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h4 className="text-base font-bold mb-1.5">Хязгаарлагдмал санал</h4>
          <p className="text-orange-100 text-sm mb-4 leading-relaxed">
            Эхний захиалгадаа 10% хөнгөлөлт эдлэнэ. Өнөөдөр дуусна.
          </p>
          <button className="w-full bg-white text-orange-600 font-bold py-2.5 px-4 rounded-xl text-sm hover:bg-orange-50 transition-colors active:scale-[0.98]">
            Урамшуулал авах
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function StoreHeaderPopover({
  label,
  icon,
  align = "left",
  children,
}: {
  label: string;
  icon: React.ReactNode;
  align?: "left" | "center";
  children: React.ReactNode;
}) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 [&::-webkit-details-marker]:hidden">
        {icon}
        <span>{label}</span>
        <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
      </summary>
      <div
        className={`absolute top-[calc(100%+0.5rem)] z-30 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.16)] ${
          align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"
        }`}
      >
        {children}
      </div>
    </details>
  );
}

function StorefrontHeader({ data }: { data: OrganizationDetailData }) {
  const storeUrl = `https://mglstore.mn/o/${encodeURIComponent(
    data.slug || data.id,
  )}`;
  const trustChips = [
    {
      label: data.isVerified
        ? "Баталгаажсан байгууллага"
        : "Байгууллагын мэдээлэл",
      emphasized: true,
    },
    {
      label: `${data.products.length} барааны сонголт`,
      emphasized: false,
    },
    {
      label: `${data.stats.soldCount.toLocaleString("mn-MN")} борлуулалт`,
      emphasized: false,
    },
    { label: `${data.stats.customers} хэрэглэгч`, emphasized: false },
  ];

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-100">
          <Image
            src={data.logo}
            alt={data.name}
            fill
            priority
            className="object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="truncate text-xl font-black text-slate-950 sm:text-2xl">
              {data.name}
            </h1>
            <StoreHeaderPopover
              label="Үнэлгээ, баталгаажуулалт"
              icon={<ShieldCheck className="h-3.5 w-3.5 text-blue-500" />}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <p className="text-xs font-bold text-slate-400">
                    Дэлгүүрийн нийт үнэлгээ
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-950">
                    {formatOrganizationRating(data.rating)}
                    <span className="text-sm text-slate-400">/5</span>
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>
              <dl className="mt-3 grid gap-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="font-bold text-slate-500">Баталгаажуулалт</dt>
                  <dd className="font-black text-emerald-600">
                    {data.isVerified ? "Баталгаатай" : "Хүлээгдэж буй"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="font-bold text-slate-500">Үнэлгээ</dt>
                  <dd className="font-black text-slate-900">
                    {data.reviewCount} хэрэглэгч
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="font-bold text-slate-500">Борлуулалт</dt>
                  <dd className="font-black text-slate-900">
                    {data.stats.soldCount.toLocaleString("mn-MN")}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="font-bold text-slate-500">Төлөв</dt>
                  <dd
                    className={`font-black ${
                      data.isOpen ? "text-emerald-600" : "text-slate-500"
                    }`}
                  >
                    {data.isOpen ? "Нээлттэй" : "Хаалттай"}
                  </dd>
                </div>
              </dl>
            </StoreHeaderPopover>
            <StoreHeaderPopover
              label="QR-аар дэлгүүр нээх"
              align="center"
              icon={<QrCode className="h-3.5 w-3.5 text-orange-500" />}
            >
              <div className="flex flex-col items-center text-center">
                <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
                  <QrGenerator value={storeUrl} size={156} level="M" />
                </div>
                <p className="mt-3 text-sm font-black text-slate-900">
                  Утсаараа QR уншуулна уу
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                  {data.name} дэлгүүрийг утсан дээрээ шууд нээнэ.
                </p>
              </div>
            </StoreHeaderPopover>
            {data.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-600">
                <ShieldCheck className="h-3 w-3" />
                Баталгаат
              </span>
            )}
            {data.isOpen && (
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-600">
                Нээлттэй
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1 text-amber-600">
              <Star className="h-3.5 w-3.5 fill-current" />
              {formatOrganizationRating(data.rating)}/5
            </span>
            <span>{data.reviewCount} үнэлгээ</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              {data.stats.customers} хэрэглэгч
            </span>
            <span>{data.products.length} бараа</span>
            <span>
              {data.stats.soldCount.toLocaleString("mn-MN")} зарагдсан
            </span>
            {data.info.hours.length > 0 && (
              <span
                className="inline-flex items-center gap-1 text-slate-600"
                title={data.info.hours.join(" · ")}
              >
                <Clock className="h-3.5 w-3.5 text-emerald-500" />
                {data.info.hours[0]}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.categories.map((category) => (
              <span
                key={category}
                className="rounded-md bg-orange-50 px-2 py-1 text-[10px] font-black text-orange-700"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {data.info.phone && (
            <a
              href={`tel:${data.info.phone}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-700 transition hover:border-orange-200 hover:text-orange-600"
            >
              <Phone className="h-4 w-4" />
              Холбогдох
            </a>
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto border-t border-slate-100 pt-3">
        {trustChips.map((chip) => (
          <span
            key={chip.label}
            className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold ${
              chip.emphasized
                ? "bg-orange-50 text-orange-700"
                : "bg-slate-50 text-slate-500"
            }`}
          >
            {chip.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function StoreWebsiteNav({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <>
      <StoreUtilityBar containerClassName={STOREFRONT_CONTAINER_CLASS} />

      <div className="border-b border-slate-100 bg-slate-50">
        <div
          className={`${STOREFRONT_CONTAINER_CLASS} flex h-20 items-center gap-5`}
        >
          <Link href="/" className="shrink-0">
            <Image
              src="/logo-storefront.webp"
              alt="MGL Store"
              width={126}
              height={56}
              priority
              className="h-auto w-24 object-contain sm:w-28"
            />
          </Link>
          <label className="relative ml-auto w-full max-w-xl">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Дэлгүүрээс бараа хайх..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-24 text-sm font-semibold outline-none transition focus:border-orange-400"
            />
            <span className="absolute right-1.5 top-1.5 flex h-8 items-center rounded-lg bg-orange-500 px-4 text-[11px] font-black text-white">
              Хайх
            </span>
          </label>
        </div>
      </div>
    </>
  );
}

function StorefrontCatalog({
  products,
  search,
  onSearchChange,
}: {
  products: ProductItem[];
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<"default" | "newest" | "price">("default");
  const [pagination, setPagination] = useState({
    filterKey: "",
    count: STOREFRONT_PAGE_SIZE,
  });
  const categories = useMemo(
    () => [
      ...new Set(
        products
          .map((product) => product.category)
          .filter((value): value is string => Boolean(value)),
      ),
    ],
    [products],
  );
  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("mn-MN");
    const next = products.filter(
      (product) =>
        (category === "all" || product.category === category) &&
        (!normalizedSearch ||
          product.title.toLocaleLowerCase("mn-MN").includes(normalizedSearch)),
    );
    return [...next].sort((left, right) => {
      if (sort === "price") return left.price - right.price;
      if (sort === "newest") {
        return getItemTime(right.createdAt) - getItemTime(left.createdAt);
      }
      return 0;
    });
  }, [category, products, search, sort]);
  const filterKey = `${category}:${sort}:${search.trim().toLocaleLowerCase("mn-MN")}`;
  const visibleCount =
    pagination.filterKey === filterKey
      ? pagination.count
      : STOREFRONT_PAGE_SIZE;
  const renderedProducts = useMemo(
    () => visibleProducts.slice(0, visibleCount),
    [visibleCount, visibleProducts],
  );
  const hasMoreProducts = renderedProducts.length < visibleProducts.length;
  const loadMoreRef = useInfiniteScroll({
    enabled: hasMoreProducts,
    onLoadMore: () => {
      setPagination({
        filterKey,
        count: visibleCount + STOREFRONT_PAGE_SIZE,
      });
    },
    rootMargin: "500px 0px",
  });

  return (
    <section className="mt-4 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-3 py-3 sm:px-5">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`h-10 shrink-0 rounded-xl px-4 text-xs font-black transition ${
              category === "all"
                ? "bg-orange-600 text-white shadow-sm shadow-orange-200"
                : "bg-slate-50 text-slate-600 hover:bg-orange-50 hover:text-orange-600"
            }`}
          >
            Бүх бараа <span className="ml-1 opacity-70">{products.length}</span>
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`h-10 shrink-0 rounded-xl px-4 text-xs font-bold transition ${
                category === item
                  ? "bg-orange-600 text-white shadow-sm shadow-orange-200"
                  : "bg-slate-50 text-slate-600 hover:bg-orange-50 hover:text-orange-600"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0 p-3 sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1.5">
            {(
              [
                ["default", "Ерөнхий"],
                ["newest", "Шинэ"],
                ["price", "Үнэ"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSort(value)}
                className={`h-9 rounded-lg px-3 text-xs font-black transition ${
                  sort === value
                    ? "bg-orange-50 text-orange-700 ring-1 ring-orange-100"
                    : "bg-slate-50 text-slate-500 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Бараа хайх..."
              className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs font-semibold outline-none focus:border-orange-400 sm:w-52"
            />
          </label>
        </div>

        {visibleProducts.length === 0 ? (
          <div className="py-20 text-center text-sm font-bold text-slate-400">
            Тохирох бараа олдсонгүй
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {renderedProducts.map((product) => (
              <StorefrontProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        {hasMoreProducts && (
          <div
            ref={loadMoreRef}
            className="mt-6 flex min-h-20 flex-col items-center justify-center gap-2 border-t border-slate-100 pt-5"
            aria-live="polite"
          >
            <p className="text-xs font-bold text-slate-400">
              {renderedProducts.length}/{visibleProducts.length} бараа
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <LoaderCircle
                className="h-4 w-4 animate-spin text-orange-500"
                aria-hidden="true"
              />
              Дараагийн бараануудыг ачаалж байна…
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function StickyStoreHeader({
  data,
  search,
  onSearchChange,
}: {
  data: OrganizationDetailData;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <motion.header
      initial={{ y: -76, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -76, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-x-0 top-0 z-[90] border-b border-slate-200 bg-white/98 shadow-sm backdrop-blur"
    >
      <div
        className={`${STOREFRONT_CONTAINER_CLASS} flex h-[76px] items-center gap-3`}
      >
        <Link
          href={`/o/${encodeURIComponent(data.slug || data.id)}`}
          className="flex min-w-0 items-center gap-3"
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100">
            <Image
              src={data.logo}
              alt=""
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0">
            <p className="max-w-48 truncate text-sm font-black text-slate-950">
              {data.name}
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-[10px] font-bold text-slate-400">
              <span className="text-amber-500">
                ★ {formatOrganizationRating(data.rating)}/5
              </span>
              <span>{data.stats.customers} хэрэглэгч</span>
            </p>
          </div>
        </Link>

        <label className="relative ml-auto hidden w-full max-w-xl sm:block">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={`${data.name}-с бараа хайх...`}
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-24 text-sm font-semibold outline-none transition focus:border-orange-400 focus:bg-white"
          />
          <span className="absolute right-1.5 top-1.5 flex h-8 items-center rounded-lg bg-orange-500 px-4 text-[11px] font-black text-white">
            Хайх
          </span>
        </label>

        <a
          href={data.info.phone ? `tel:${data.info.phone}` : "#"}
          className="hidden h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-700 transition hover:text-orange-600 md:inline-flex"
        >
          <MessageCircle className="h-4 w-4" />
          Холбогдох
        </a>
      </div>
    </motion.header>
  );
}

/* ─── Root ──────────────────────────────────────────────────── */
export default function BusinessProfileClient({
  data,
}: {
  data: OrganizationDetailData;
}) {
  const headerSentinelRef = useRef<HTMLDivElement>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");

  useEffect(() => {
    const target = headerSentinelRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyHeader(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-16px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-10">
      <AnimatePresence>
        {showStickyHeader && (
          <StickyStoreHeader
            data={data}
            search={storeSearch}
            onSearchChange={setStoreSearch}
          />
        )}
      </AnimatePresence>
      <StoreWebsiteNav search={storeSearch} onSearchChange={setStoreSearch} />
      <div className={`${STOREFRONT_CONTAINER_CLASS} py-4`}>
        <div ref={headerSentinelRef}>
          <StorefrontHeader data={data} />
        </div>
        <StorefrontCatalog
          products={data.products as ProductItem[]}
          search={storeSearch}
          onSearchChange={setStoreSearch}
        />
      </div>

      {/* Mobile sticky contact */}
      {data.info.phone && (
        <div className="fixed bottom-0 left-0 z-50 w-full border-t border-slate-200/80 bg-white/95 px-4 pb-5 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-lg gap-3">
            <a
              href={`tel:${data.info.phone}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3.5 text-[15px] font-bold text-white shadow-md shadow-orange-500/20 active:scale-[0.98]"
            >
              <Phone className="w-5 h-5" />
              Холбогдох
            </a>
          </div>
          <p className="mt-2 text-center text-[11px] font-medium text-slate-400">
            5 мин дотор хариу өгнө
          </p>
        </div>
      )}
    </div>
  );
}
