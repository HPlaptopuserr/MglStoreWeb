"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  ArrowRight,
  Store,
  Pill,
  Coffee,
  Smartphone,
  Briefcase,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { API } from "@/lib/api";

type GroupedCategory = {
  category: string;
  label: string;
  partners: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  }[];
};

const categoryIcons: Record<string, LucideIcon> = {
  retail: Store,
  service: Briefcase,
  food: Coffee,
  pharmacy: Pill,
  electronics: Smartphone,
  other: Store,
};

const normalizeGroupedCategories = (payload: unknown): GroupedCategory[] => {
  const maybeArray = Array.isArray(payload)
    ? payload
    : typeof payload === "object" && payload !== null
      ? Array.isArray((payload as { data?: unknown }).data)
        ? (payload as { data: unknown[] }).data
        : Array.isArray((payload as { categories?: unknown }).categories)
          ? (payload as { categories: unknown[] }).categories
          : Array.isArray((payload as { items?: unknown }).items)
            ? (payload as { items: unknown[] }).items
            : []
      : [];

  return maybeArray
    .filter((item): item is GroupedCategory => {
      if (typeof item !== "object" || item === null) return false;
      const category = item as Partial<GroupedCategory>;
      return (
        typeof category.category === "string" &&
        typeof category.label === "string" &&
        Array.isArray(category.partners)
      );
    })
    .map((category) => ({
      ...category,
      partners: category.partners.filter(
        (partner) =>
          partner &&
          typeof partner.id === "string" &&
          typeof partner.name === "string" &&
          typeof partner.slug === "string",
      ),
    }));
};

export const PartnerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<GroupedCategory[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const activeCategory = categories[activeIndex] ?? categories[0];
  const ActiveIcon = activeCategory
    ? categoryIcons[activeCategory.category] || Store
    : Store;

  useEffect(() => {
    fetch(`${API}/partners/grouped`)
      .then((res) => res.json())
      .then((payload: unknown) => {
        const data = normalizeGroupedCategories(payload);
        const sorted = [...data].sort((a, b) => b.partners.length - a.partners.length);
        setCategories(sorted);
        setActiveIndex(0);
        setTotalCount(data.reduce((sum, cat) => sum + cat.partners.length, 0));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className="h-full flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`flex h-full items-center gap-1.5 text-sm font-semibold transition-colors ${
          isOpen ? "text-orange-600" : "text-gray-600 hover:text-gray-900"
        }`}
      >
        Гишүүд
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 top-full z-50 max-h-[calc(100vh-8.5rem)] w-full overflow-y-auto overscroll-contain border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-2xl shadow-slate-900/10 [scrollbar-gutter:stable]"
            data-lenis-prevent="true"
          >
            <div className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
              <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-950">
                      Баталгаажсан гишүүн байгууллагууд
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Ангиллаар нь хурдан харж, байгууллагын дэлгүүр рүү орно.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
                  <Store className="h-4 w-4 text-orange-500" />
                  {totalCount.toLocaleString()} байгууллага
                </div>
              </div>

              {categories.length === 0 || !activeCategory ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-500">
                  Бүртгэлтэй байгууллага байхгүй байна
                </p>
              ) : (
                <div className="grid min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_1fr]">
                  <aside className="border-b border-slate-200 bg-slate-50/80 p-3 lg:border-b-0 lg:border-r">
                    <div className="mb-2 px-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                      Ангилал
                    </div>
                    <div className="max-h-[360px] space-y-1 overflow-y-auto pr-1">
                      {categories.map((category, idx) => {
                        const Icon = categoryIcons[category.category] || Store;
                        const active = idx === activeIndex;
                        return (
                          <button
                            key={`${category.category}-${idx}`}
                            type="button"
                            onMouseEnter={() => setActiveIndex(idx)}
                            onFocus={() => setActiveIndex(idx)}
                            onClick={() => setActiveIndex(idx)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                              active
                                ? "bg-white text-slate-950 shadow-sm ring-1 ring-orange-100"
                                : "text-slate-600 hover:bg-white hover:text-slate-950"
                            }`}
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                active
                                  ? "bg-orange-50 text-orange-600"
                                  : "bg-white text-slate-400"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold">
                                {category.label}
                              </span>
                              <span className="block text-xs text-slate-400">
                                {category.partners.length} байгууллага
                              </span>
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                active
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {category.partners.length}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </aside>

                  <section className="p-5 sm:p-6">
                    <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                          <ActiveIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-950">
                            {activeCategory.label}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Энэ ангиллын баталгаажсан байгууллагууд
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/organizations?category=${encodeURIComponent(activeCategory.category)}`}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                      >
                        Бүгдийг харах
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {activeCategory.partners.slice(0, 12).map((partner) => (
                        <Link
                          key={partner.id}
                          href={`/organizations/${partner.slug}`}
                          onClick={() => setIsOpen(false)}
                          className="group flex min-w-0 items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-all hover:border-orange-100 hover:bg-orange-50"
                          title={partner.name}
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-500 group-hover:bg-white group-hover:text-orange-600">
                            {partner.name.trim().charAt(0).toUpperCase() || "M"}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-slate-800 group-hover:text-orange-700">
                              {partner.name}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-400">
                              Байгууллагын дэлгүүр
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>

                    {activeCategory.partners.length > 12 && (
                      <div className="mt-5 rounded-xl border border-dashed border-orange-200 bg-orange-50/60 px-4 py-3">
                        <Link
                          href={`/organizations?category=${encodeURIComponent(activeCategory.category)}`}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-2 text-sm font-black text-orange-700 hover:text-orange-800"
                        >
                          + {activeCategory.partners.length - 12} байгууллага нэмэлтээр харах
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    )}
                  </section>
                </div>
              )}

              <div className="mt-6 flex shrink-0 flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Нийт{" "}
                  <span className="font-bold text-slate-950">{totalCount}+</span>{" "}
                  баталгаажсан гишүүн байгууллагууд.
                </p>

                <Link
                  href="/organizations"
                  onClick={() => setIsOpen(false)}
                  className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition-colors hover:bg-orange-500"
                >
                  Гишүүд байгууллагуудын мэдээлэл харах
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
