"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { OrganizationDetailData } from "./page";
import {
  Star,
  MapPin,
  Clock,
  Truck,
  Phone,
  MessageCircle,
  ShoppingBag,
  Search,
  User,
  ShoppingCart,
  Menu,
  ShieldCheck,
  Users,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Crown,
} from "lucide-react";
import { getInvestorRingStyle } from "@/lib/utils";

type ProductItem = OrganizationDetailData["products"][number] & {
  isAvailable?: boolean;
};



function formatPrice(price: number | undefined) {
  if (typeof price !== "number" || Number.isNaN(price)) return "Тодорхойгүй";
  return `${price.toLocaleString("en-US")}₮`;
}

function HeroSection({ data }: { data: OrganizationDetailData }) {
  const hasProducts = data.products && data.products.length > 0;
  const isActiveNow = data.isOpen;
  const responseTime = "5 мин дотор хариу өгнө";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full h-[320px] sm:h-[400px] lg:h-[480px] rounded-[2rem] overflow-hidden mb-12 shadow-sm"
    >
      <Image
        src={data.coverImage}
        alt={data.name}
        fill
        className="object-cover"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

      <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 lg:gap-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 sm:gap-8 flex-1">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="shrink-0"
            style={data.investor?.investmentAmount ? { ...getInvestorRingStyle(data.investor.investmentAmount), borderRadius: "1.5rem" } : undefined}
          >
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-[1.5rem] border-4 border-white overflow-hidden bg-white shadow-xl">
            <Image
              src={data.logo}
              alt={data.name}
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
            {isActiveNow && (
              <div
                className="absolute bottom-2 right-2 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm"
                title="Яг одоо идэвхтэй"
              />
            )}
            </div>
          </motion.div>

          <div className="flex-1 text-white pb-1 sm:pb-2">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
              {data.isOpen && (
                <span className="bg-emerald-500 text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  Нээлттэй
                </span>
              )}
              {data.isVerified && (
                <span className="bg-blue-500 text-white text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Баталгаат
                </span>
              )}
              {data.investor?.isInvestor && (
                <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <Crown className="w-3.5 h-3.5" />
                  {data.investor.level ||
                    (data.investor.tier === "TOP"
                      ? "Top Investor"
                      : data.investor.tier === "STRATEGIC"
                        ? "Strategic Investor"
                        : "Investor")}
                </span>
              )}
              {data.categories.map((cat, i) => (
                <span
                  key={i}
                  className="bg-white/20 backdrop-blur-md text-white text-[10px] sm:text-xs font-medium px-3 py-1 rounded-full border border-white/10"
                >
                  {cat}
                </span>
              ))}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-3 tracking-tight drop-shadow-md">
              {data.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm sm:text-base text-slate-200 mb-3">
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span className="text-white font-bold text-lg leading-none">
                  {data.rating}
                </span>
                <span className="text-slate-300 font-medium text-sm">
                  ({data.reviewCount} үнэлгээ)
                </span>
              </div>
              {isActiveNow && (
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Яг одоо идэвхтэй
                </div>
              )}
            </div>
            <p className="line-clamp-2 font-medium text-slate-100 text-base sm:text-lg max-w-2xl drop-shadow-sm">
              {data.shortDescription}
            </p>
          </div>
        </div>

        <div className="hidden lg:flex flex-col items-end shrink-0 pb-2">
          {hasProducts ? (
            <>
              <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-orange-500/30 transition-all flex items-center gap-3 active:scale-[0.98] text-lg mb-2">
                <ShoppingBag className="w-6 h-6" />
                Захиалга өгөх
              </button>
              <p className="text-white/90 text-sm font-medium flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Өнөөдөр захиалбал хүргэнэ
              </p>
            </>
          ) : (
            <>
              <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-orange-500/30 transition-all flex items-center gap-3 active:scale-[0.98] text-lg mb-2">
                <Phone className="w-6 h-6" />
                Холбоо барих
              </button>
              <p className="text-white/90 text-sm font-medium flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {responseTime}
              </p>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TrustBadges({ stats }: { stats: OrganizationDetailData["stats"] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-8"
    >
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
          <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-bold text-slate-900">
            Баталгаажсан
          </p>
          <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5">
            Албан ёсны дэлгүүр
          </p>
        </div>
      </div>
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
          <Users className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-bold text-slate-900">
            {stats.customers} харилцагч
          </p>
          <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5">
            Итгэл хүлээсэн
          </p>
        </div>
      </div>
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 col-span-2 sm:col-span-1 hover:shadow-md transition-shadow">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
          <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-bold text-slate-900">
            {stats.years} жил
          </p>
          <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5">
            Үйл ажиллагаа явуулсан
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function ExpandableDescription({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const highlightKeywords = (content: string) => {
    const keywords = [
      "органик",
      "шинэ",
      "түргэн шуурхай хүргэх",
      "хүнсний аюулгүй байдлыг",
    ];
    let highlightedText = content;
    keywords.forEach((keyword) => {
      const regex = new RegExp(`(${keyword})`, "gi");
      highlightedText = highlightedText.replace(
        regex,
        '<span class="text-emerald-600 font-semibold bg-emerald-50 px-1 rounded">$1</span>'
      );
    });
    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm mb-10"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between sm:cursor-default sm:pointer-events-none"
      >
        <div className="flex items-center gap-3 mb-0 sm:mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
            <User className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Бидний тухай
          </h2>
        </div>
        <div className="sm:hidden text-slate-400">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>

      <div className={`mt-4 sm:mt-0 ${isExpanded ? "block" : "hidden sm:block"}`}>
        <div className="prose prose-slate max-w-none">
          <p
            className={`text-slate-600 leading-relaxed text-base ${
              !isExpanded ? "line-clamp-3 sm:line-clamp-none" : ""
            }`}
          >
            {highlightKeywords(text)}
          </p>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden sm:flex items-center gap-1.5 text-orange-600 font-semibold text-sm mt-4 hover:text-orange-700 transition-colors bg-orange-50 px-4 py-2 rounded-xl"
          >
            {isExpanded ? "Хураах" : "Цааш унших"}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function InfoCards({ info }: { info: OrganizationDetailData["info"] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12"
    >
      {info.hours && info.hours.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex flex-col gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Цагийн хуваарь
            </h4>
            <div className="space-y-1.5">
              {info.hours.map((line, i) => (
                <p key={i} className="text-[15px] font-semibold text-slate-900">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {info.delivery && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex flex-col gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Хүргэлт
            </h4>
            <p className="text-[15px] font-semibold text-slate-900">
              {info.delivery.text}
            </p>
            {info.delivery.price && (
              <p className="text-sm font-medium text-slate-500 mt-1.5">
                {info.delivery.price}
              </p>
            )}
          </div>
        </div>
      )}

      {info.location && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex flex-col gap-4 sm:col-span-2 lg:col-span-1 group">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Хаяг
            </h4>
            <p className="text-[15px] font-semibold text-slate-900 leading-relaxed">
              {info.location}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ProductsSection({ products }: { products: ProductItem[] }) {
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      product.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="mt-12"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Бүтээгдэхүүн
        </h2>
        <div className="relative w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Бараа хайх..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all w-full sm:w-72 shadow-sm"
          />
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 px-4 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center"
        >
          <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6">
            <ShoppingBag className="w-12 h-12 text-orange-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">
            {products.length === 0
              ? "Одоогоор бүтээгдэхүүн нэмэгдэж байна"
              : "Хайлтад тохирох бараа олдсонгүй"}
          </h3>
          <p className="text-slate-500 max-w-md mx-auto mb-8 leading-relaxed text-base">
            {products.length === 0
              ? "Та шууд холбогдож захиалга өгөх боломжтой. Бид танд шуурхай үйлчлэх болно."
              : "Өөр хайлтын үг оруулаад үз."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]">
              <Phone className="w-5 h-5" />
              Холбоо барих
            </button>
            <Link
              href="/organizations"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-2xl bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 transition-all active:scale-[0.98]"
            >
              Бусад дэлгүүр үзэх
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => {
            const isAvailable =
              typeof product.stock === "number" ? product.stock > 0 : true;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex flex-col bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                <div className="relative w-full aspect-square bg-slate-50 overflow-hidden">
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  {!isAvailable && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                        Дууссан
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-[11px] font-medium text-slate-500 mb-1">
                    {product.category || "Ангилалгүй"}
                  </p>
                  <h3 className="text-sm font-bold text-slate-900 mb-2 line-clamp-2 leading-tight flex-1">
                    {product.title}
                  </h3>
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <span className="text-base font-extrabold text-orange-600">
                      {formatPrice(product.price)}
                    </span>
                    <button
                      disabled={!isAvailable}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isAvailable
                          ? "bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white active:scale-95"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function SidebarActions({ data }: { data: OrganizationDetailData }) {
  const hasProducts = data.products && data.products.length > 0;
  const responseTime = "5 мин дотор хариу өгнө";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
      className="sticky top-24 space-y-6"
    >
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-4">
          {hasProducts ? (
            <div>
              <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98] text-lg">
                <ShoppingBag className="w-6 h-6" />
                Захиалга өгөх
              </button>
              <p className="text-center text-xs font-medium text-slate-500 mt-2 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Өнөөдөр захиалбал хүргэнэ
              </p>
            </div>
          ) : (
            <div>
              {data.info.phone ? (
                <a
                  href={`tel:${data.info.phone}`}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98] text-lg"
                >
                  <Phone className="w-6 h-6" />
                  Холбоо барих
                </a>
              ) : (
                <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98] text-lg">
                  <Phone className="w-6 h-6" />
                  Холбоо барих
                </button>
              )}
              <p className="text-center text-xs font-medium text-slate-500 mt-2 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {responseTime}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {hasProducts && (
              <>
                {data.info.phone ? (
                  <a
                    href={`tel:${data.info.phone}`}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <Phone className="w-5 h-5" />
                    Холбоо барих
                  </a>
                ) : (
                  <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                    <Phone className="w-5 h-5" />
                    Холбоо барих
                  </button>
                )}
              </>
            )}
            <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
              <MessageCircle className="w-5 h-5" />
              Chat
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-6 rounded-3xl text-white shadow-lg shadow-orange-500/20 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-black/10 rounded-full blur-xl" />

        <div className="relative z-10">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-5 backdrop-blur-sm border border-white/20">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <h4 className="text-lg font-bold mb-2">Хязгаарлагдмал хугацаа</h4>
          <p className="text-orange-50 text-sm mb-6 leading-relaxed">
            Эхний захиалгадаа 10% хөнгөлөлт эдлээрэй. Өнөөдөр дуусна.
          </p>
          <button className="bg-white text-orange-600 font-bold py-3 px-4 rounded-xl text-sm w-full hover:bg-orange-50 transition-colors active:scale-[0.98]">
            Урамшуулал авах
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function BusinessProfileClient({
  data,
}: {
  data: OrganizationDetailData;
}) {
  return (
    <div className="min-h-screen flex flex-col pb-24 lg:pb-0 bg-slate-50">

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <HeroSection data={data} />

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <div className="flex-1 min-w-0">
            <TrustBadges stats={data.stats} />

            {/* Investor highlight section */}
            {data.investor?.isInvestor && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 p-5 sm:p-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                    <Crown className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      MGL Store-д хөрөнгө оруулсан
                    </h3>
                    {data.investor.level && (
                      <span className="text-xs font-semibold text-amber-600">
                        {data.investor.level}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Энэ байгууллага нь MGL Store платформд хөрөнгө оруулсан
                  итгэлт түнш юм.
                </p>
              </motion.div>
            )}

            <ExpandableDescription text={data.description} />
            <InfoCards info={data.info} />
            <ProductsSection products={data.products as ProductItem[]} />
          </div>

          <div className="w-full lg:w-[340px] shrink-0 hidden lg:block">
            <SidebarActions data={data} />
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200/60 p-4 flex flex-col gap-2 z-50 lg:hidden pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex gap-3">
          {data.products && data.products.length > 0 ? (
            <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-2xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
              <ShoppingBag className="w-5 h-5" />
              Захиалах
            </button>
          ) : data.info.phone ? (
            <a
              href={`tel:${data.info.phone}`}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-2xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Phone className="w-5 h-5" />
              Холбогдох
            </a>
          ) : (
            <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-2xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
              <Phone className="w-5 h-5" />
              Холбогдох
            </button>
          )}

          <button className="w-14 h-14 bg-slate-50 text-slate-700 font-semibold rounded-2xl border border-slate-200 flex items-center justify-center shadow-sm shrink-0 active:scale-[0.98]">
            <MessageCircle className="w-6 h-6" />
          </button>
        </div>
        <p className="text-center text-[11px] font-medium text-slate-500">
          {data.products && data.products.length > 0
            ? "Өнөөдөр захиалбал хүргэнэ"
            : "5 мин дотор хариу өгнө"}
        </p>
      </div>
    </div>
  );
}