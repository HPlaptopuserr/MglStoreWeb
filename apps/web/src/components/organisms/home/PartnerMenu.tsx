"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
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

export const PartnerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<GroupedCategory[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetch(`${API}/partners/grouped`)
      .then((res) => res.json())
      .then((data: GroupedCategory[]) => {
        setCategories(data);
        setTotalCount(data.reduce((sum, cat) => sum + cat.partners.length, 0));
      })
      .catch(console.error);
  }, []);

  return (
    <div
      className="h-full flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        className={`flex h-full items-center gap-1.5 text-sm font-semibold transition-colors ${
          isOpen ? "text-orange-600" : "text-gray-600 hover:text-gray-900"
        }`}
      >
        Гишүүн байгууллагууд
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
            className="absolute left-0 top-full z-50 w-full border-b border-gray-200 bg-white shadow-xl"
          >
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              {categories.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  Бүртгэлтэй байгууллага байхгүй байна
                </p>
              ) : (
                <div
                  className={`grid gap-8`}
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(categories.length, 4)}, 1fr)`,
                  }}
                >
                  {categories.map((category, idx) => {
                    const Icon = categoryIcons[category.category] || Store;
                    return (
                      <div key={idx} className="min-h-0">
                        <div className="mb-5 flex items-center gap-3 text-gray-900">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                            <Icon className="h-5 w-5" />
                          </div>
                          <h3 className="text-base font-bold">
                            {category.label}
                          </h3>
                          <span className="ml-auto text-xs font-medium text-gray-400">
                            {category.partners.length}
                          </span>
                        </div>

                        <div
                          className="max-h-80 overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]"
                          data-lenis-prevent="true"
                        >
                          <ul className="space-y-3">
                            {category.partners
                              .slice(0, 10)
                              .map((partner, pIdx) => (
                                <li key={pIdx}>
                                  <Link
                                    href={`/company/${partner.slug}`}
                                    className="inline-block text-sm text-gray-500 transition-transform hover:translate-x-1 hover:text-orange-600"
                                  >
                                    {partner.name}
                                  </Link>
                                </li>
                              ))}
                            {category.partners.length > 10 && (
                              <li>
                                <Link
                                  href="/organizations"
                                  className="inline-block text-sm font-semibold text-orange-500 hover:text-orange-600"
                                >
                                  + {category.partners.length - 10} бусад...
                                </Link>
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                <p className="text-sm text-gray-500">
                  Нийт{" "}
                  <span className="font-bold text-gray-900">{totalCount}+</span>{" "}
                  баталгаажсан гишүүн байгууллагууд.
                </p>

                <Link
                  href="/organizations"
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
