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
  const [totalCount, setTotalCount] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch(`${API}/partners/grouped`)
      .then((res) => res.json())
      .then((payload: unknown) => {
        const data = normalizeGroupedCategories(payload);
        const sorted = [...data].sort((a, b) => b.partners.length - a.partners.length);
        setCategories(sorted);
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
            className="absolute left-0 top-full z-50 max-h-[calc(100vh-8.5rem)] w-full overflow-y-auto overscroll-contain border-b border-gray-200 bg-white shadow-xl [scrollbar-gutter:stable]"
            data-lenis-prevent="true"
          >
            <div className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
              {categories.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  Бүртгэлтэй байгууллага байхгүй байна
                </p>
              ) : (
                <div
                  className="grid auto-rows-fr grid-cols-1 gap-4 pr-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                  {categories.map((category, idx) => {
                    const Icon = categoryIcons[category.category] || Store;
                    return (
                      <div key={idx} className="min-w-0 rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <div className="mb-4 flex items-start gap-3 text-gray-900">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                            <Icon className="h-5 w-5" />
                          </div>
                          <h3 className="min-w-0 break-words text-base font-bold leading-6">
                            {category.label}
                          </h3>
                          <span className="ml-auto shrink-0 pt-1 text-xs font-medium text-gray-400">
                            {category.partners.length}
                          </span>
                        </div>

                        <ul className="space-y-2">
                          {category.partners.slice(0, 10).map((partner, pIdx) => (
                            <li key={pIdx}>
                              <Link
                                href={`/organizations/${partner.slug}`}
                                onClick={() => setIsOpen(false)}
                                className="block truncate text-sm text-gray-500 transition-colors hover:text-orange-600"
                                title={partner.name}
                              >
                                {partner.name}
                              </Link>
                            </li>
                          ))}
                          {category.partners.length > 10 && (
                            <li>
                              <Link
                                href="/organizations"
                                onClick={() => setIsOpen(false)}
                                className="inline-block text-sm font-semibold text-orange-500 hover:text-orange-600"
                              >
                                + {category.partners.length - 10} бусад...
                              </Link>
                            </li>
                          )}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 flex shrink-0 items-center justify-between border-t border-gray-100 pt-5">
                <p className="text-sm text-gray-500">
                  Нийт{" "}
                  <span className="font-bold text-gray-900">{totalCount}+</span>{" "}
                  баталгаажсан гишүүн байгууллагууд.
                </p>

                <Link
                  href="/organizations"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center gap-1 text-sm font-bold text-orange-600 hover:text-orange-700"
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
