"use client";
import { useEffect, useState, useRef } from "react";
import {
  ShoppingBasket,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Star,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { API } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";

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

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [grouped, setGrouped] = useState<GroupedCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [catsRes, groupedRes] = await Promise.all([
          fetch(`${API}/business-categories`),
          fetch(`${API}/partners/grouped`),
        ]);
        if (catsRes.ok) setCategories(await catsRes.json());
        if (groupedRes.ok) setGrouped(await groupedRes.json());
      } catch (error) {
        console.error("Failed to load categories", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const bgColors = [
    "bg-green-50 text-green-600",
    "bg-blue-50 text-blue-600",
    "bg-yellow-50 text-yellow-600",
    "bg-orange-50 text-orange-600",
    "bg-red-50 text-red-600",
    "bg-teal-50 text-teal-600",
    "bg-pink-50 text-pink-600",
    "bg-purple-50 text-purple-600",
  ];

  const activeBgColors = [
    "bg-green-600 text-white",
    "bg-blue-600 text-white",
    "bg-yellow-500 text-white",
    "bg-orange-500 text-white",
    "bg-red-500 text-white",
    "bg-teal-500 text-white",
    "bg-pink-500 text-white",
    "bg-purple-500 text-white",
  ];

  const activePartners = activeSlug
    ? grouped.find((g) => g.category === activeSlug)?.partners ?? []
    : [];

  const activeCatName = activeSlug
    ? categories.find((c) => c.slug === activeSlug)?.name ??
      grouped.find((g) => g.category === activeSlug)?.label ??
      activeSlug
    : "";

  const handleCategoryClick = (slug: string) => {
    setActiveSlug((prev) => (prev === slug ? null : slug));
  };

  return (
    <div className="py-16 sm:py-24 bg-white">
      <div className="container mx-auto px-4 lg:px-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-left"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 tracking-tight">
              Ангиллаар дэлгүүр хэсэх
            </h2>
            <p className="text-sm sm:text-lg text-gray-500">
              Ангилал дээр дарж тухайн ангилалд хамаарах байгууллагуудыг харна уу
            </p>
          </motion.div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll("right")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center text-slate-500 py-10 border border-dashed rounded-2xl">
            Ангилал олдсонгүй
          </div>
        ) : (
          <>
            {/* Category pills */}
            <div
              ref={scrollContainerRef}
              className="flex overflow-x-auto pb-4 gap-4 sm:gap-6 snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {categories.map((cat, index) => {
                const isActive = activeSlug === cat.slug;
                const colorClass = isActive
                  ? activeBgColors[index % activeBgColors.length]
                  : bgColors[index % bgColors.length];
                const partnerCount =
                  grouped.find((g) => g.category === cat.slug)?.partners
                    .length ?? 0;

                return (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05, duration: 0.4 }}
                    className={`shrink-0 w-32 sm:w-36 flex flex-col items-center justify-center p-6 rounded-3xl transition-all group border snap-center cursor-pointer ${
                      isActive
                        ? "bg-white shadow-xl shadow-gray-200/50 -translate-y-1 border-orange-200 ring-2 ring-orange-100"
                        : "bg-gray-50 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 border-transparent hover:border-gray-100"
                    }`}
                    onClick={() => handleCategoryClick(cat.slug)}
                  >
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300 ${colorClass}`}
                    >
                      {cat.icon ? (
                        cat.icon.startsWith("data:image") ||
                        cat.icon.startsWith("http") ? (
                          <img
                            src={cat.icon}
                            alt={cat.name}
                            className="w-8 h-8 object-contain"
                          />
                        ) : (
                          <span className="text-3xl">{cat.icon}</span>
                        )
                      ) : (
                        <ShoppingBasket className="w-7 h-7" />
                      )}
                    </div>
                    <span
                      className={`text-sm font-semibold text-center transition-colors ${
                        isActive ? "text-orange-600" : "text-gray-700 group-hover:text-gray-900"
                      }`}
                    >
                      {cat.name}
                    </span>
                    {partnerCount > 0 && (
                      <span
                        className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? "bg-orange-100 text-orange-600"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {partnerCount}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Expanded category organizations */}
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
                  <div className="pt-8 sm:pt-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                          {activeCatName}
                        </h3>
                        <span className="text-sm font-medium text-gray-400">
                          ({activePartners.length} байгууллага)
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveSlug(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        <X size={14} />
                        Хаах
                      </button>
                    </div>

                    {activePartners.length === 0 ? (
                      <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl">
                        <p className="text-sm text-gray-400">
                          Энэ ангилалд байгууллага олдсонгүй
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                        {activePartners.map((partner, idx) => (
                          <motion.div
                            key={partner.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: idx * 0.04,
                              duration: 0.3,
                            }}
                          >
                            <Link
                              href={`/organizations/${partner.slug}`}
                              className="group flex flex-col items-center p-4 sm:p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-lg hover:border-orange-200 hover:-translate-y-0.5 transition-all duration-300"
                            >
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden mb-3 sm:mb-4 shrink-0">
                                {partner.logoUrl ? (
                                  <div className="relative w-full h-full">
                                    <Image
                                      src={partner.logoUrl}
                                      alt={partner.name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-amber-500">
                                    <span className="text-white text-xl sm:text-2xl font-black">
                                      {partner.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <h4 className="text-sm font-bold text-gray-900 text-center line-clamp-2 group-hover:text-orange-600 transition-colors mb-1">
                                {partner.name}
                              </h4>
                              <span className="text-[11px] font-medium text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                Дэлгүүр орох
                                <ArrowRight size={10} />
                              </span>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {activePartners.length > 0 && (
                      <div className="mt-6 text-center">
                        <Link
                          href="/organizations"
                          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-orange-600 bg-orange-50 rounded-full hover:bg-orange-100 transition-colors"
                        >
                          Бүх байгууллагуудыг харах
                          <ArrowRight size={16} />
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
    </div>
  );
}
