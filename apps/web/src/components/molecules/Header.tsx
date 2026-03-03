"use client";

import Link from "next/link";
import React, { useState } from "react";
import { ShoppingCart, User, Truck, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { Logo } from "@/components/atoms/Logo";
import { SearchBar } from "@/components/molecules/SearchBar";
import { MegaMenu } from "@/components/molecules/MegaMenu";

export const Header = () => {
  const [isSwapped, setIsSwapped] = useState(false);

  const navItems = [
    "Хүнс",
    "Цайны газар / Ресторан",
    "Зочид буудал",
    "Эмийн сан",
    "Аялал жуулчлал",
    "Барлига, Үл хөдлөх",
    "Барилгын дэлгүүр",
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white flex flex-col">
      <div className="border-b border-slate-100 py-3">
        <div className="container mx-auto px-4 flex items-center justify-between gap-8 h-14">
          <div className="shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="MglStore Logo"
                width={70}
                height={50}
              />
            </Link>
          </div>

          <div className="hidden md:flex-1 max-w-3xl md:flex items-center justify-center">
            <SearchBar />
          </div>

          <div className="shrink-0 flex items-center gap-6">
            <div className="hidden lg:flex bg-amber-500 rounded-full p-1 items-center shadow-sm">
              {/* delivery link stays fixed */}
              {isSwapped ? (
                <div
                  className="bg-white text-amber-500 rounded-full p-1.5 px-3 flex items-center justify-center cursor-pointer"
                  onClick={() => setIsSwapped(false)}
                >
                  <ShoppingBag size={18} strokeWidth={2.5} />
                </div>
              ) : (
                <Link href="/delivery" className="rounded-full">
                  <div className="bg-amber-500 text-white rounded-full p-1.5 px-3 flex items-center justify-center">
                    <Truck size={18} strokeWidth={2.5} />
                  </div>
                </Link>
              )}

              {isSwapped ? (
                <Link href="/delivery" className="rounded-full">
                  <div className="bg-amber-500 text-white rounded-full p-1.5 px-3 flex items-center justify-center">
                    <Truck size={18} strokeWidth={2.5} />
                  </div>
                </Link>
              ) : (
                <div
                  className="bg-white text-amber-500 rounded-full p-1.5 px-3 flex items-center justify-center cursor-pointer"
                  onClick={() => setIsSwapped(true)}
                >
                  <ShoppingBag size={18} strokeWidth={2.5} />
                </div>
              )}
            </div>

            <button className="hidden sm:flex items-center gap-2 text-slate-700 hover:text-amber-600 transition-colors font-medium text-sm tracking-wide uppercase">
              <User size={22} className="text-slate-600" />
              <span>Нэвтрэх</span>
            </button>

            <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 transition-colors text-white rounded-full px-5 py-2.5 font-bold shadow-md shadow-amber-200">
              <ShoppingCart size={20} />
              <span>₮ 0.00</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 flex items-center gap-6 h-12">
          <div className="h-full flex items-center border-l border-r border-slate-100 px-2 shrink-0">
            <MegaMenu />
          </div>

          <nav className="hidden md:flex flex-1 items-center gap-8 overflow-x-auto no-scrollbar scroll-smooth">
            {navItems.map((item) => (
              <Link
                key={item}
                href={`/category/${item.toLowerCase().replace(/ /g, "-")}`}
                className="whitespace-nowrap text-sm font-semibold text-slate-600 hover:text-amber-500 transition-colors"
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
