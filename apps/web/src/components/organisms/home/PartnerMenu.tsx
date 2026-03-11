"use client";

import Link from "next/link";
import React, { useState } from "react";
import {
  ChevronDown,
  ArrowRight,
  Store,
  Pill,
  Coffee,
  Smartphone,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
export const PartnerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);



  const partnerCategories = [
    {
      title: "Supermarkets & Convenience",
      icon: Store,
      partners: [
        "Nomin Supermarket",
        "CU Mongolia",
        "GS25",
        "E-Mart",
        "Sansar",
      ],
    },
    {
      title: "Pharmacies & Health",
      icon: Pill,
      partners: [
        "Monos Pharmacy",
        "Tavan Bogd Pharma",
        "Aziin Pharma",
        "Mofarm",
        "E-Mart Pharmacy",
      ],
    },
    {
      title: "Food & Bakery",
      icon: Coffee,
      partners: [
        "Jur Ur Bakery",
        "Tous Les Jours",
        "Primeat",
        "KFC",
        "Burger King",
        "Jur Ur Bakery",
        "Tous Les Jours",
        "Primeat",
        "KFC",
        "Burger King",
        "Jur Ur Bakery",
        "Tous Les Jours",
        "Primeat",
        "KFC",
        "Burger King",
        "Primeat",
        "KFC",
        "Burger King",
      ],
    },
    {
      title: "Electronics & Home",
      icon: Smartphone,
      partners: [
        "BSB Service",
        "Next Electronics",
        "Nomin Electronics",
        "PC Mall",
        "TechnoZone",
      ],
    },
  ];

  return (
    <div
      className="h-full flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        className={`flex h-full items-center gap-1.5 text-sm font-semibold transition-colors ${isOpen ? "text-orange-600" : "text-gray-600 hover:text-gray-900"
          }`}
      >
        Хамтран ажиллагчид
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
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
              <div className="grid grid-cols-4 gap-8">
                {partnerCategories.map((category, idx) => (
                  <div key={idx} className="min-h-0">
                    <div className="mb-5 flex items-center gap-3 text-gray-900">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                        <category.icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-bold">{category.title}</h3>
                    </div>

                    <div
                      className="max-h-[320px] overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]"
                      data-lenis-prevent="true"
                    >
                      <ul className="space-y-3">
                        {category.partners.map((partner, pIdx) => (
                          <li key={pIdx}>
                            <Link
                              href="#"
                              className="inline-block text-sm text-gray-500 transition-transform hover:translate-x-1 hover:text-orange-600"
                            >
                              {partner}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                <p className="text-sm text-gray-500">
                  Over <span className="font-bold text-gray-900">120+</span>{" "}
                  verified partner organizations in our network.
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
