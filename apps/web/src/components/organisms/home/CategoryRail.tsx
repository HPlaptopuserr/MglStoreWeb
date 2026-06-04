"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import type { WheelEvent } from "react";
import {
  ShoppingBasket,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { API } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";

/* ─── Types ─────────────────────────────────────────────────── */
interface Category {
  id: string;
  slug: string;
  name: string;
  icon?: string;
}

interface GroupedCategory {
  category: string;
  label: string;
  partners: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  }[];
}

/* ─── Color palette (soft pastel pairs) ─────────────────────── */
const PALETTE = [
  { bg: "bg-violet-50", text: "text-violet-600", ring: "ring-violet-200", badge: "bg-violet-100 text-violet-700", hover: "group-hover:bg-violet-50 group-hover:text-violet-600" },
  { bg: "bg-sky-50", text: "text-sky-600", ring: "ring-sky-200", badge: "bg-sky-100 text-sky-700", hover: "group-hover:bg-sky-50 group-hover:text-sky-600" },
  { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-200", badge: "bg-emerald-100 text-emerald-700", hover: "group-hover:bg-emerald-50 group-hover:text-emerald-600" },
  { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-200", badge: "bg-amber-100 text-amber-700", hover: "group-hover:bg-amber-50 group-hover:text-amber-600" },
  { bg: "bg-rose-50", text: "text-rose-600", ring: "ring-rose-200", badge: "bg-rose-100 text-rose-700", hover: "group-hover:bg-rose-50 group-hover:text-rose-600" },
  { bg: "bg-teal-50", text: "text-teal-600", ring: "ring-teal-200", badge: "bg-teal-100 text-teal-700", hover: "group-hover:bg-teal-50 group-hover:text-teal-600" },
  { bg: "bg-fuchsia-50", text: "text-fuchsia-600", ring: "ring-fuchsia-200", badge: "bg-fuchsia-100 text-fuchsia-700", hover: "group-hover:bg-fuchsia-50 group-hover:text-fuchsia-600" },
  { bg: "bg-cyan-50", text: "text-cyan-600", ring: "ring-cyan-200", badge: "bg-cyan-100 text-cyan-700", hover: "group-hover:bg-cyan-50 group-hover:text-cyan-600" },
  { bg: "bg-orange-50", text: "text-orange-600", ring: "ring-orange-200", badge: "bg-orange-100 text-orange-700", hover: "group-hover:bg-orange-50 group-hover:text-orange-600" },
  { bg: "bg-indigo-50", text: "text-indigo-600", ring: "ring-indigo-200", badge: "bg-indigo-100 text-indigo-700", hover: "group-hover:bg-indigo-50 group-hover:text-indigo-600" },
];

/* ─── CategoryIcon ──────────────────────────────────────────── */
function CatIcon({ icon, name, size = 28 }: { icon?: string; name: string; size?: number }) {
  if (!icon) return <ShoppingBasket size={size} />;
  const value = icon.trim();
  const isImage =
    value.startsWith("data:image/") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/");
  const isSafeText =
    value.length > 0 &&
    value.length <= 8 &&
    !/^[A-Za-z0-9+/=]{6,}$/.test(value);

  if (isImage) {
    return <img src={icon} alt={name} className="object-contain" style={{ width: size, height: size }} />;
  }
  if (isSafeText) {
    return <span style={{ fontSize: size * 0.85 }} className="leading-none">{value}</span>;
  }
  return <ShoppingBasket size={size} />;
}

/* ─── PartnerCard ───────────────────────────────────────────── */
function PartnerCard({ partner, index }: { partner: GroupedCategory["partners"][0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
    >
      <Link
        href={`/organizations/${partner.slug}`}
        className="group flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white/90 p-3.5 shadow-sm shadow-slate-100/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-white hover:shadow-xl hover:shadow-orange-100/50"
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 ring-4 ring-slate-50 transition group-hover:ring-orange-50">
          {partner.logoUrl ? (
            <Image src={partner.logoUrl} alt={partner.name} width={48} height={48} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500">
              <span className="text-lg font-black text-white">{partner.name.charAt(0)}</span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-orange-600">
            {partner.name}
          </h4>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition-colors group-hover:text-orange-500">
            Дэлгүүр үзэх <ArrowRight size={10} />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── CategoryPill ──────────────────────────────────────────── */
function CategoryPill({
  cat,
  index,
  isActive,
  partnerCount,
  onClick,
}: {
  cat: Category;
  index: number;
  isActive: boolean;
  partnerCount: number;
  onClick: () => void;
}) {
  const p = PALETTE[index % PALETTE.length];

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      onClick={onClick}
      className={`group relative flex shrink-0 snap-center cursor-pointer flex-col items-center rounded-2xl border px-3 py-4 transition-all duration-300 ${
        isActive
          ? `-translate-y-1 border-white bg-white shadow-2xl shadow-orange-100/60 ring-2 ${p.ring}`
          : "border-white/70 bg-white/70 shadow-sm shadow-slate-100 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:shadow-xl hover:shadow-slate-200/60"
      }`}
      style={{ width: 112 }}
    >
      <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

      {/* Icon circle */}
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner transition-all duration-300 ${
          isActive ? `${p.bg} ${p.text} scale-105` : `bg-slate-50 text-slate-400 ${p.hover}`
        }`}
      >
        <CatIcon icon={cat.icon} name={cat.name} size={26} />
      </div>

      {/* Name */}
      <span
        className={`mt-3 line-clamp-2 min-h-[34px] text-center text-[12px] font-black leading-[17px] transition-colors ${
          isActive ? "text-slate-950" : "text-slate-600 group-hover:text-slate-950"
        }`}
      >
        {cat.name}
      </span>

      {/* Count badge */}
      {partnerCount > 0 && (
        <span
          className={`mt-2 inline-flex h-5 items-center justify-center rounded-full px-2 text-[10px] font-bold transition-colors ${
            isActive ? p.badge : "bg-slate-100 text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500"
          }`}
        >
          {partnerCount}
        </span>
      )}

      {/* Active dot */}
      {isActive && (
        <motion.div
          layoutId="activeDot"
          className={`absolute -bottom-1.5 left-1/2 h-1.5 w-6 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500`}
        />
      )}
    </motion.button>
  );
}

/* ─── Main Component ────────────────────────────────────────── */
export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [grouped, setGrouped] = useState<GroupedCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(checkScroll);
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, categories.length, grouped.length, isLoading]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -420 : 420, behavior: "smooth" });
  };

  const handleRailWheel = (event: WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY;
    if (delta === 0) return;
    event.preventDefault();
    el.scrollLeft += delta;
    requestAnimationFrame(checkScroll);
  };

  useEffect(() => {
    (async () => {
      try {
        const [catsRes, groupedRes] = await Promise.all([
          fetch(`${API}/business-categories`),
          fetch(`${API}/partners/grouped`),
        ]);
        if (catsRes.ok) setCategories(await catsRes.json());
        if (groupedRes.ok) setGrouped(await groupedRes.json());
      } catch { /* silently fail */ } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const activePartners = activeSlug
    ? grouped.find((g) => g.category === activeSlug)?.partners ?? []
    : [];

  const activeCatName = activeSlug
    ? categories.find((c) => c.slug === activeSlug)?.name ??
      grouped.find((g) => g.category === activeSlug)?.label ?? ""
    : "";

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_68%)] py-10 sm:py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_50%_0%,rgba(251,146,60,0.14),transparent_58%)]" />
      <div className="container relative mx-auto px-4 lg:px-8">
        {/* Header */}
        <div className="mb-7 flex items-end justify-between gap-6">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3.5 py-1.5 text-xs font-black text-orange-600 shadow-sm shadow-orange-100/60">
              <ShoppingBasket size={13} />
              АНГИЛАЛУУД
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Ангиллаар дэлгүүр хэсэх
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500 sm:text-base">
              Ангилал дээр дарж байгууллагуудыг харна уу
            </p>
          </motion.div>

          {/* Scroll arrows */}
          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => scroll("left")}
              disabled={!canLeft}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-orange-200 hover:text-orange-600 hover:shadow-md disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canRight}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-orange-200 hover:text-orange-600 hover:shadow-md disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center text-gray-400">
            Ангилал олдсонгүй
          </div>
        ) : (
          <>
            {/* Category rail */}
            <div className="relative rounded-[28px] border border-white bg-white/55 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100/80 backdrop-blur">
              <div
                ref={scrollRef}
                onWheel={handleRailWheel}
                className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-0.5 pb-5 pt-2"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {categories.map((cat, i) => (
                  <CategoryPill
                    key={cat.id}
                    cat={cat}
                    index={i}
                    isActive={activeSlug === cat.slug}
                    partnerCount={grouped.find((g) => g.category === cat.slug)?.partners.length ?? 0}
                    onClick={() => setActiveSlug((prev) => (prev === cat.slug ? null : cat.slug))}
                  />
                ))}
              </div>
              <div className="pointer-events-none absolute inset-y-3 left-3 w-12 rounded-l-[24px] bg-gradient-to-r from-white/90 to-transparent" />
              <div className="pointer-events-none absolute inset-y-3 right-3 w-12 rounded-r-[24px] bg-gradient-to-l from-white/90 to-transparent" />
            </div>

            {/* Expanded panel */}
            <AnimatePresence>
              {activeSlug && (
                <motion.div
                  key={activeSlug}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-8 rounded-[28px] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
                    {/* Panel header */}
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${PALETTE[categories.findIndex((c) => c.slug === activeSlug) % PALETTE.length]?.bg} ${PALETTE[categories.findIndex((c) => c.slug === activeSlug) % PALETTE.length]?.text}`}>
                          <CatIcon icon={categories.find((c) => c.slug === activeSlug)?.icon} name={activeCatName} size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{activeCatName}</h3>
                          <p className="text-xs text-gray-400">{activePartners.length} байгууллага</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveSlug(null)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Partner grid */}
                    {activePartners.length === 0 ? (
                      <div className="rounded-2xl border-2 border-dashed border-gray-100 py-12 text-center text-sm text-gray-400">
                        Энэ ангилалд байгууллага олдсонгүй
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {activePartners.map((partner, idx) => (
                          <PartnerCard key={partner.id} partner={partner} index={idx} />
                        ))}
                      </div>
                    )}

                    {activePartners.length > 0 && (
                      <div className="mt-6 text-center">
                        <Link
                          href="/organizations"
                          className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
                        >
                          Бүх байгууллагуудыг харах
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </section>
  );
}
