"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { ShoppingCart, User, Truck, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { SearchBar } from "../../SearchBar";
import { MegaMenu } from "@/components/MegaMenu";

export const HEADER_HEIGHT = "128px"; // top row 56 + nav row 48

export const Header = () => {
  const [isSwapped, setIsSwapped] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 24) {
        setShowHeader(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    "Хүнс",
    "Цайны газар / Ресторан",
    "Зочид буудал",
    "Эмийн сан",
    "Аялал жуулчлал",
    "Барилга, Үл хөдлөх",
    "Барилгын дэлгүүр",
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex flex-col bg-white/95 backdrop-blur-md transition-transform duration-500 ease-in-out ${
        showHeader ? "translate-y-0" : "-translate-y-full"
      }`}
    >
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

      <div className="border-b border-slate-200 bg-white">
        <div className="container mx-auto flex h-12 items-center gap-6 px-4">
          <div className="flex h-full shrink-0 items-center border-x border-slate-100 px-2">
            <MegaMenu />
          </div>

          <nav className="no-scrollbar hidden flex-1 items-center gap-8 overflow-x-auto md:flex">
            {navItems.map((item) => (
              <Link
                key={item}
                href={`/category/${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="whitespace-nowrap text-sm font-semibold text-slate-600 hover:text-amber-500"
              >
                {item}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};
