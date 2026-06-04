"use client";
import { useEffect, useState, useRef, useCallback } from "react";
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
  { bg: "bg-violet-50", text: "text-violet-500", ring: "ring-violet-200", badge: "bg-violet-100 text-violet-600" },
  { bg: "bg-sky-50", text: "text-sky-500", ring: "ring-sky-200", badge: "bg-sky-100 text-sky-600" },
  { bg: "bg-emerald-50", text: "text-emerald-500", ring: "ring-emerald-200", badge: "bg-emerald-100 text-emerald-600" },
  { bg: "bg-amber-50", text: "text-amber-500", ring: "ring-amber-200", badge: "bg-amber-100 text-amber-600" },
  { bg: "bg-rose-50", text: "text-rose-500", ring: "ring-rose-200", badge: "bg-rose-100 text-rose-600" },
  { bg: "bg-teal-50", text: "text-teal-500", ring: "ring-teal-200", badge: "bg-teal-100 text-teal-600" },
  { bg: "bg-fuchsia-50", text: "text-fuchsia-500", ring: "ring-fuchsia-200", badge: "bg-fuchsia-100 text-fuchsia-600" },
  { bg: "bg-cyan-50", text: "text-cyan-500", ring: "ring-cyan-200", badge: "bg-cyan-100 text-cyan-600" },
  { bg: "bg-orange-50", text: "text-orange-500", ring: "ring-orange-200", badge: "bg-orange-100 text-orange-600" },
  { bg: "bg-indigo-50", text: "text-indigo-500", ring: "ring-indigo-200", badge: "bg-indigo-100 text-indigo-600" },
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
        className="group flex items-center gap-3.5 rounded-2xl border border-gray-100 bg-white p-3.5 transition-all duration-200 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-100/40 hover:-translate-y-0.5"
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
          {partner.logoUrl ? (
            <Image src={partner.logoUrl} alt={partner.name} width={48} height={48} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500">
              <span className="text-lg font-black text-white">{partner.name.charAt(0)}</span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
            {partner.name}
          </h4>
          <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400 group-hover:text-amber-500 transition-colors">
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
      className={`group relative flex shrink-0 flex-col items-center snap-center cursor-pointer rounded-xl px-3 py-4 transition-all duration-300 ${
        isActive
          ? `bg-white shadow-lg shadow-gray-200/60 ring-2 ${p.ring} -translate-y-1`
          : "bg-white/60 hover:bg-white hover:shadow-md hover:shadow-gray-100 hover:-translate-y-0.5"
      }`}
      style={{ width: 104 }}
    >
      {/* Icon circle */}
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-300 ${
          isActive ? `${p.bg} ${p.text} scale-105` : `bg-gray-50 text-gray-400 group-hover:${p.bg} group-hover:${p.text}`
        }`}
      >
        <CatIcon icon={cat.icon} name={cat.name} size={26} />
      </div>

      {/* Name */}
      <span
        className={`mt-3 text-center text-[12px] font-bold leading-tight transition-colors line-clamp-2 ${
          isActive ? "text-gray-900" : "text-gray-600 group-hover:text-gray-900"
        }`}
      >
        {cat.name}
      </span>

      {/* Count badge */}
      {partnerCount > 0 && (
        <span
          className={`mt-2 inline-flex h-5 items-center justify-center rounded-full px-2 text-[10px] font-bold transition-colors ${
            isActive ? p.badge : "bg-gray-100 text-gray-400"
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
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, [checkScroll, categories]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
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
    <section className="bg-gradient-to-b from-slate-50 to-white py-10 sm:py-12">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Header */}
        <div className="mb-7 flex items-end justify-between">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-600 ring-1 ring-amber-200/60">
              <ShoppingBasket size={13} />
              АНГИЛАЛУУД
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              Ангиллаар дэлгүүр хэсэх
            </h2>
            <p className="mt-2 text-sm text-gray-500 sm:text-base">
              Ангилал дээр дарж байгууллагуудыг харна уу
            </p>
          </motion.div>

          {/* Scroll arrows */}
          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => scroll("left")}
              disabled={!canLeft}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-all hover:border-gray-300 hover:shadow-sm disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canRight}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-all hover:border-gray-300 hover:shadow-sm disabled:opacity-30"
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
            <div
              ref={scrollRef}
              className="grid grid-flow-col auto-cols-[104px] gap-3 overflow-x-auto px-0.5 pb-3 pt-1 snap-x snap-mandatory"
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
                  <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
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
