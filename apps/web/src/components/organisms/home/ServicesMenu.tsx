"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronDown,
  GraduationCap,
  Megaphone,
  Scale,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { MGL_SERVICES_DATA } from "@/app/our-services/data";
import type { ServiceCategory } from "@/app/our-services/types";
import { API } from "@/lib/api";

const serviceIcons: Record<string, LucideIcon> = {
  GraduationCap,
  Scale,
  Megaphone,
  Users,
};

const normalizeServices = (payload: unknown): ServiceCategory[] => {
  if (!Array.isArray(payload)) return [];

  return payload.filter((category): category is ServiceCategory => {
    if (typeof category !== "object" || category === null) return false;
    const item = category as Partial<ServiceCategory>;
    return (
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.description === "string" &&
      typeof item.icon === "string" &&
      Array.isArray(item.subCategories)
    );
  });
};

export const ServicesMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>(MGL_SERVICES_DATA);
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const activeCategory = categories[activeIndex] ?? categories[0];
  const ActiveIcon = activeCategory
    ? serviceIcons[activeCategory.icon] || BriefcaseBusiness
    : BriefcaseBusiness;
  const serviceCount = categories.reduce(
    (sum, category) =>
      sum +
      category.subCategories.reduce(
        (subSum, subCategory) => subSum + subCategory.items.length,
        0,
      ),
    0,
  );

  useEffect(() => {
    fetch(`${API}/site-settings`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (!data || typeof data !== "object") return;
        const rawServices = (data as Record<string, unknown>)["mgl-services"];
        if (typeof rawServices !== "string") return;
        const parsed = JSON.parse(rawServices);
        const normalized = normalizeServices(parsed);
        if (normalized.length > 0) {
          const hasTraining = normalized.some((category) => category.id === "training");
          setCategories(hasTraining ? normalized : [MGL_SERVICES_DATA[0], ...normalized]);
          setActiveIndex(0);
        }
      })
      .catch(() => {});
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
    <div ref={menuRef} className="flex h-full items-center">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`flex h-full items-center gap-1.5 text-sm font-semibold transition-colors ${
          isOpen ? "text-amber-600" : "text-gray-600 hover:text-gray-900"
        }`}
      >
        Үйлчилгээ
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
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-950">
                      Манайхаас гаргаж буй үйлчилгээнүүд
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Ангилал сонгоод тухайн үйлчилгээ, сургалтын мэдээллийг хурдан харна.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
                  <BriefcaseBusiness className="h-4 w-4 text-amber-500" />
                  {serviceCount} үйлчилгээ
                </div>
              </div>

              <div className="grid min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_1fr]">
                <aside className="border-b border-slate-200 bg-slate-50/80 p-3 lg:border-b-0 lg:border-r">
                  <div className="mb-2 px-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Үйлчилгээний төрөл
                  </div>
                  <div className="space-y-1">
                    {categories.map((category, idx) => {
                      const Icon = serviceIcons[category.icon] || BriefcaseBusiness;
                      const active = idx === activeIndex;
                      const itemCount = category.subCategories.reduce(
                        (sum, subCategory) => sum + subCategory.items.length,
                        0,
                      );

                      return (
                        <button
                          key={category.id}
                          type="button"
                          onMouseEnter={() => setActiveIndex(idx)}
                          onFocus={() => setActiveIndex(idx)}
                          onClick={() => setActiveIndex(idx)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                            active
                              ? "bg-white text-slate-950 shadow-sm ring-1 ring-amber-100"
                              : "text-slate-600 hover:bg-white hover:text-slate-950"
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              active
                                ? "bg-amber-50 text-amber-600"
                                : "bg-white text-slate-400"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">
                              {category.title}
                            </span>
                            <span className="block text-xs text-slate-400">
                              {itemCount} сонголт
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </aside>

                {activeCategory && (
                  <section className="p-5 sm:p-6">
                    <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                          <ActiveIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-950">
                            {activeCategory.title}
                          </h3>
                          <p className="mt-1 max-w-2xl text-sm text-slate-500">
                            {activeCategory.description}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/our-services#${activeCategory.id}`}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                      >
                        Дэлгэрэнгүй
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>

                    <div className="space-y-5">
                      {activeCategory.subCategories.map((subCategory) => (
                        <div key={subCategory.id}>
                          <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">
                            {subCategory.title}
                          </h4>
                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {subCategory.items.slice(0, 6).map((item) => (
                              <Link
                                key={item.id}
                                href={`/our-services#${activeCategory.id}`}
                                onClick={() => setIsOpen(false)}
                                className="group min-w-0 rounded-xl border border-transparent px-3 py-3 transition-all hover:border-amber-100 hover:bg-amber-50"
                              >
                                <span className="block truncate text-sm font-bold text-slate-800 group-hover:text-amber-700">
                                  {item.name}
                                </span>
                                <span className="mt-1 block text-xs text-slate-400">
                                  {item.priceLabel || `${item.price.toLocaleString()}₮`}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <div className="mt-6 flex shrink-0 flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Эхний ангилалд үйлчилгээний салбарын ажилчдад зориулсан сургалтууд багтсан.
                </p>
                <Link
                  href="/our-services"
                  onClick={() => setIsOpen(false)}
                  className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition-colors hover:bg-amber-500"
                >
                  Бүх үйлчилгээг харах
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
