"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Truck, ShoppingBag, ShoppingCart, User } from "lucide-react";
import Image from "next/image";
import { SearchBar } from "../../SearchBar";
import { MegaMenu } from "@/components/MegaMenu";
import { PartnerMenu } from "@/components/organisms/home/PartnerMenu";
import CategoryRail from "../home/CategoryRail";

export const HEADER_HEIGHT = "128px";

export const Header = () => {
  const [isSwapped, setIsSwapped] = useState(false);

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

      <div className="relative hidden border-t border-gray-100 md:block">
        <div className="container mx-auto flex h-14 items-center justify-between gap-8 px-4">
          <div className="flex h-12 items-center gap-8">
            <MegaMenu />
            <PartnerMenu />

          </div>

          <Link
            href="#"
            className="ml-auto flex items-center gap-2 text-sm font-bold text-red-600 transition-colors hover:text-red-700"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
            </span>
            Today&apos;s Deals
          </Link>
        </div>
      </div>
    </header>
  );
};
