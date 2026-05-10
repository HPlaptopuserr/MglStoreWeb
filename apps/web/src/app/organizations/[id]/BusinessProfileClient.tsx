"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { OrganizationDetailData, ServicePost } from "./page";
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
} from "lucide-react";
import { InvestorRingWrapper } from "@/components/atoms/InvestorRingWrapper";
import { ProductDetailOverlay } from "@/components/organisms/ProductDetailOverlay";
import { ServiceDetailOverlay } from "@/app/services/_components/ServiceDetailOverlay";

type ProductItem = OrganizationDetailData["products"][number] & {
  isAvailable?: boolean;
};

function formatPrice(price: number | undefined) {
  if (typeof price !== "number" || Number.isNaN(price)) return "—";
  return `${price.toLocaleString("en-US")}₮`;
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
            <InvestorRingWrapper investmentAmount={data.investor?.investmentAmount} rounded="xl">
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
                    {data.investor.level || "Investor"}
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
function StatsStrip({ stats, isVerified }: { stats: OrganizationDetailData["stats"]; isVerified: boolean }) {
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
          <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center`}>
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
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
      content: [info.delivery.text, info.delivery.price].filter(Boolean).join(" — "),
    },
    info.location && {
      icon: <MapPin className="w-5 h-5" />,
      color: "text-emerald-500 bg-emerald-50",
      title: "Хаяг",
      content: info.location,
    },
  ].filter(Boolean) as { icon: React.ReactNode; color: string; title: string; content: string }[];

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
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
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
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 3).map((tag) => (
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
        <ServiceDetailOverlay postId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </motion.div>
  );
}

/* ─── Products ──────────────────────────────────────────────── */
function ProductsSection({ products }: { products: ProductItem[] }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => products.filter((p) => p.title.toLowerCase().includes(search.toLowerCase())),
    [products, search]
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
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-5">
            <ShoppingBag className="w-10 h-10 text-orange-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-2">
            {products.length === 0 ? "Бүтээгдэхүүн удахгүй нэмэгдэнэ" : "Хайлтад тохирохгүй"}
          </h3>
          <p className="text-sm text-slate-400 max-w-xs mb-6 leading-relaxed">
            {products.length === 0
              ? "Шууд холбогдож захиалга өгөх боломжтой."
              : "Өөр үгээр хайж үзнэ үү."}
          </p>
          {products.length === 0 && (
            <Link
              href="/organizations"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
            >
              Бусад дэлгүүр үзэх
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map((product) => {
            const available = typeof product.stock === "number" ? product.stock > 0 : true;
            return (
              <motion.button
                key={product.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedId(product.id)}
                className="group text-left bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg transition-all"
              >
                <div className="relative w-full aspect-square bg-slate-50 overflow-hidden">
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
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
                      {formatPrice(product.price)}
                    </span>
                    <button
                      disabled={!available}
                      onClick={(e) => e.stopPropagation()}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        available
                          ? "bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white"
                          : "bg-slate-100 text-slate-300 cursor-not-allowed"
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {selectedId && (
        <ProductDetailOverlay productId={selectedId} onClose={() => setSelectedId(null)} />
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
            {hasProducts ? "Өнөөдөр захиалбал хүргэнэ" : "5 мин дотор хариу өгнө"}
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

/* ─── Root ──────────────────────────────────────────────────── */
export default function BusinessProfileClient({
  data,
}: {
  data: OrganizationDetailData;
}) {
  return (
    <div className="min-h-screen bg-[#F8F8F6] pb-28 lg:pb-10">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Hero */}
        <HeroSection data={data} />

        <div className="mt-5 flex flex-col lg:flex-row gap-6 lg:gap-10">
          {/* Main column */}
          <div className="flex-1 min-w-0 space-y-5">
            <StatsStrip stats={data.stats} isVerified={data.isVerified} />

            {/* Investor banner */}
            {data.investor?.isInvestor && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/60 p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    MGL Store-д хөрөнгө оруулсан{data.investor.level ? ` · ${data.investor.level}` : ""}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Энэ байгууллага нь MGL Store платформд хөрөнгө оруулсан итгэлт түнш.
                  </p>
                </div>
              </motion.div>
            )}

            <AboutSection text={data.description} />
            <InfoCards info={data.info} />
            <ProductsSection products={data.products as ProductItem[]} />
            <ServicesSection posts={data.servicePosts} />
          </div>

          {/* Sidebar – desktop only */}
          <div className="w-full lg:w-[300px] xl:w-[320px] shrink-0 hidden lg:block">
            <Sidebar data={data} />
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-4 pt-3 pb-5 z-50 lg:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        <div className="flex gap-3 max-w-lg mx-auto">
          {data.products.length > 0 ? (
            <button className="flex-1 bg-orange-500 active:scale-[0.98] text-white font-bold py-3.5 px-5 rounded-2xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 text-[15px]">
              <ShoppingBag className="w-5 h-5" />
              Захиалах
            </button>
          ) : data.info.phone ? (
            <a
              href={`tel:${data.info.phone}`}
              className="flex-1 bg-orange-500 active:scale-[0.98] text-white font-bold py-3.5 px-5 rounded-2xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 text-[15px]"
            >
              <Phone className="w-5 h-5" />
              Холбогдох
            </a>
          ) : (
            <button className="flex-1 bg-orange-500 active:scale-[0.98] text-white font-bold py-3.5 px-5 rounded-2xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 text-[15px]">
              <Phone className="w-5 h-5" />
              Холбогдох
            </button>
          )}
          <button className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center shrink-0 hover:bg-slate-200 transition-colors active:scale-[0.98]">
            <MessageCircle className="w-5 h-5" />
          </button>
        </div>
        <p className="text-center text-[11px] text-slate-400 font-medium mt-2">
          {data.products.length > 0 ? "Өнөөдөр захиалбал хүргэнэ" : "5 мин дотор хариу өгнө"}
        </p>
      </div>
    </div>
  );
}
