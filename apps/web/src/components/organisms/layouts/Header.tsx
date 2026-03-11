"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Truck, ShoppingBag, Pill, Coffee, Smartphone } from "lucide-react";
import {
  ShoppingCart,
  User,
  ChevronDown,
  ArrowRight,
  Store,
} from "lucide-react";
import Image from "next/image";
import { SearchBar } from "../../SearchBar";
import { MegaMenu } from "@/components/MegaMenu";
import { motion, AnimatePresence } from "motion/react";

export const HEADER_HEIGHT = "128px";

export const Header = () => {
  const [isSwapped, setIsSwapped] = useState(false);
  const [isPartnerMenuOpen, setIsPartnerMenuOpen] = useState(false);

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
    <header className="fixed top-0 left-0 right-0 z-50 flex flex-col bg-white/95 backdrop-blur-md">
      <div className="border-b border-slate-100 py-3">
        <div className="container mx-auto flex h-14 items-center justify-between gap-8 px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image
              src="/logo.png"
              alt="MglStore Logo"
              width={70}
              height={50}
              priority
            />
          </Link>

          <div className="hidden max-w-3xl flex-1 items-center justify-center md:flex">
            <SearchBar />
          </div>

          <div className="flex shrink-0 items-center gap-6">
            <div className="hidden items-center rounded-full bg-amber-500 p-1 shadow-sm lg:flex">
              {isSwapped ? (
                <button
                  type="button"
                  className="cursor-pointer rounded-full bg-white px-3 py-1.5 text-amber-500"
                  onClick={() => setIsSwapped(false)}
                >
                  <ShoppingBag size={18} strokeWidth={2.5} />
                </button>
              ) : (
                <div className="rounded-full bg-amber-500 px-3 py-1.5 text-white">
                  <Truck size={18} strokeWidth={2.5} />
                </div>
              )}

              {isSwapped ? (
                <div className="rounded-full bg-amber-500 px-3 py-1.5 text-white">
                  <Truck size={18} strokeWidth={2.5} />
                </div>
              ) : (
                <button
                  type="button"
                  className="cursor-pointer rounded-full bg-white px-3 py-1.5 text-amber-500"
                  onClick={() => setIsSwapped(true)}
                >
                  <ShoppingBag size={18} strokeWidth={2.5} />
                </button>
              )}
            </div>

            <button
              type="button"
              className="hidden items-center gap-2 text-sm font-medium uppercase text-slate-700 hover:text-amber-600 sm:flex"
            >
              <User size={22} />
              <span>Нэвтрэх</span>
            </button>

            <button
              type="button"
              className="flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 font-bold text-white shadow-md hover:bg-amber-600"
            >
              <ShoppingCart size={20} />
              <span>₮ 0.00</span>
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 hidden md:block relative">
        <div className="container mx-auto flex h-14 items-center justify-between gap-8 px-4">
          <div className="flex items-center gap-8 h-12">
            <MegaMenu />

            <div
              className="h-full flex items-center"
              onMouseEnter={() => setIsPartnerMenuOpen(true)}
              onMouseLeave={() => setIsPartnerMenuOpen(false)}
            >
              <button
                className={`flex items-center gap-1.5 text-sm font-semibold transition-colors h-full ${
                  isPartnerMenuOpen
                    ? "text-orange-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Хамтран ажиллагчид
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isPartnerMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {isPartnerMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 w-full bg-white border-b border-gray-200 shadow-xl"
                  >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                      <div className="grid grid-cols-4 gap-8">
                        {partnerCategories.map((category, idx) => (
                          <div key={idx} className="min-h-0">
                            <div className="flex items-center gap-3 mb-5 text-gray-900">
                              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                                <category.icon className="w-5 h-5" />
                              </div>
                              <h3 className="font-bold text-base">
                                {category.title}
                              </h3>
                            </div>

                            <div className="max-h-[320px] overflow-y-auto pr-2 [scrollbar-gutter:stable]">
                              <ul className="space-y-3">
                                {category.partners.map((partner, pIdx) => (
                                  <li key={pIdx}>
                                    <Link
                                      href="#"
                                      className="text-sm text-gray-500 hover:text-orange-600 hover:translate-x-1 inline-block transition-transform"
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

                      <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
                        <p className="text-sm text-gray-500">
                          Over{" "}
                          <span className="font-bold text-gray-900">120+</span>{" "}
                          verified partner organizations in our network.
                        </p>
                        <Link
                          href="/partners"
                          className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 group"
                        >
                          View All Partners
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              href="#"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            >
              Groceries
            </Link>
            <Link
              href="#"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            >
              Pharmacy
            </Link>
            <Link
              href="#"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            >
              Electronics
            </Link>
            <Link
              href="#"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            >
              Household
            </Link>
          </div>

          <Link
            href="#"
            className="text-sm font-bold text-red-600 hover:text-red-700 transition-colors flex items-center gap-2 ml-auto"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Today&apos;s Deals
          </Link>
        </div>
      </div>
    </header>
  );
};
