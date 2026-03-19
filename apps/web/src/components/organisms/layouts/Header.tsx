"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import {
  Truck,
  ShoppingBag,
  ShoppingCart,
  User,
  Search,
  Menu,
  X,
  ShoppingBasket,
  Briefcase,
  Store,
  Tag,
  ChevronRight,
  Flame,
} from "lucide-react";
import Image from "next/image";
import { SearchBar } from "../../SearchBar";
import { MegaMenu } from "@/components/MegaMenu";
import { PartnerMenu } from "@/components/organisms/home/PartnerMenu";
import { API } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";

export const HEADER_HEIGHT = "128px";

interface MobileCategory {
  id: string;
  name: string;
  icon?: string;
}

const NAV_LINKS = [
  {
    href: "/organizations",
    label: "Дэлгүүрүүд",
    desc: "Бүх түнш дэлгүүрүүд",
    icon: Store,
    color: "bg-blue-50 text-blue-600",
  },
  {
    href: "/products",
    label: "Бүтээгдэхүүн",
    desc: "Бараа бүтээгдэхүүн",
    icon: Tag,
    color: "bg-amber-50 text-amber-600",
  },
  {
    href: "/company/partnership",
    label: "Хамтрах",
    desc: "Бизнесээ холбох",
    icon: Briefcase,
    color: "bg-green-50 text-green-600",
  },
];

export const Header = () => {
  const [isSwapped, setIsSwapped] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");
  const [mobileCategories, setMobileCategories] = useState<MobileCategory[]>(
    [],
  );
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch(`${API}/business-categories`)
      .then((r) => r.json())
      .then((data: MobileCategory[]) => {
        if (Array.isArray(data)) setMobileCategories(data);
      })
      .catch(() => {});
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileSearch.trim()) return;
    setMobileMenuOpen(false);
    router.push(`/products?q=${encodeURIComponent(mobileSearch.trim())}`);
  };

  const closeMobile = () => setMobileMenuOpen(false);

  const catColors = [
    "bg-emerald-50 text-emerald-600",
    "bg-blue-50 text-blue-600",
    "bg-amber-50 text-amber-600",
    "bg-rose-50 text-rose-600",
    "bg-purple-50 text-purple-600",
    "bg-cyan-50 text-cyan-600",
    "bg-orange-50 text-orange-600",
    "bg-pink-50 text-pink-600",
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex flex-col bg-white/95 backdrop-blur-md shadow-sm">
      <div className="border-b border-slate-100">
        <div className="container mx-auto flex h-14 items-center justify-between gap-3 px-4 md:h-16 md:gap-6">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 transition-colors active:bg-gray-100 md:hidden"
            aria-label="Цэс"
          >
            {mobileMenuOpen ? (
              <X size={20} className="text-gray-700" />
            ) : (
              <Menu size={20} className="text-gray-700" />
            )}
          </button>

          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2"
            onClick={closeMobile}
          >
            <Image
              src="/logo.png"
              alt="MglStore Logo"
              width={70}
              height={50}
              priority
            />
            <div className="hidden items-center gap-8 sm:flex py-3">
              <div className="h-8 w-px bg-gradient-to-b from-transparent via-amber-400 to-transparent" />
              <span className="max-w-[300px] font-[family-name:var(--font-marck-script)] text-[15px] leading-[1.3] text-gray-900">
                Монгол эзэнтэй жижиг дунд бизнес эрхлэгчдийн нэгдсэн холбоо
              </span>
            </div>
          </Link>

          <div className="hidden max-w-3xl flex-1 items-center justify-center md:flex">
            <SearchBar />
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-6">
            {/* Desktop: delivery/pickup toggle */}
            {/*             <div className="hidden items-center rounded-full bg-amber-500 p-1 shadow-sm lg:flex">
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
            </div> */}

            <button
              type="button"
              className="hidden items-center gap-2 text-sm font-medium uppercase text-slate-700 hover:text-amber-600 sm:flex"
            >
              <User size={22} />
              <span>Нэвтрэх</span>
            </button>

            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-600 transition-colors active:bg-gray-100 sm:hidden"
            >
              <User size={18} />
            </button>

            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-2 text-sm font-bold text-white shadow-md hover:bg-amber-600 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-base"
            >
              <ShoppingCart size={16} className="sm:h-5 sm:w-5" />
              <span>₮ 0</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Row 2 mobile: search ── */}
      <div className="border-b border-slate-100 px-4 py-2 md:hidden">
        <form onSubmit={handleMobileSearch} className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            ref={mobileSearchRef}
            type="text"
            value={mobileSearch}
            onChange={(e) => setMobileSearch(e.target.value)}
            placeholder="Бүтээгдэхүүн хайх..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition-all focus:border-amber-400 focus:bg-white focus:shadow-sm"
          />
        </form>
      </div>

      {/* ── Row 3 mobile: scrollable category pills ── */}
      {mobileCategories.length > 0 && (
        <div
          className="flex gap-2 overflow-x-auto border-b border-gray-100 px-4 py-2 md:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {mobileCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.id}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors active:bg-amber-50 active:border-amber-300 active:text-amber-700"
            >
              {cat.icon ? (
                cat.icon.startsWith("data:image") ||
                cat.icon.startsWith("http") ? (
                  <img
                    src={cat.icon}
                    alt=""
                    className="h-3.5 w-3.5 rounded-sm object-contain"
                  />
                ) : (
                  <span className="text-xs">{cat.icon}</span>
                )
              ) : (
                <ShoppingBasket size={12} className="text-gray-400" />
              )}
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* ── Row 2 desktop: MegaMenu + PartnerMenu + Categories ── */}
      <div className="relative hidden border-t border-gray-100 md:block">
        <div className="container mx-auto flex h-14 items-center gap-8 px-4">
          <div className="flex h-12 items-center gap-8">
            <MegaMenu />
            <PartnerMenu />
          </div>

          {/* Category links */}
          {mobileCategories.length > 0 && (
            <div
              className="flex items-center gap-1 overflow-x-auto ml-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {mobileCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.id}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-orange-50 hover:text-orange-600"
                >
                  {cat.icon ? (
                    cat.icon.startsWith("data:image") ||
                    cat.icon.startsWith("http") ? (
                      <img
                        src={cat.icon}
                        alt=""
                        className="h-4 w-4 rounded-sm object-contain"
                      />
                    ) : (
                      <span className="text-sm">{cat.icon}</span>
                    )
                  ) : null}
                  {cat.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════ Mobile full-screen dropdown menu ═══════ */}

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMobile}
      />

      {/* Panel — slides down from top, full width */}
      <div
        className={`fixed inset-x-0 top-0 z-50 max-h-[85vh] overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          mobileMenuOpen ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{ scrollbarWidth: "none" }}
      >
        {/* Panel header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-3.5 backdrop-blur-sm">
          <Link
            href="/"
            onClick={closeMobile}
            className="flex items-center gap-2.5"
          >
            <Image src="/logo.png" alt="MglStore" width={44} height={32} />
            <span className="text-base font-bold text-gray-900">MGL Store</span>
          </Link>
          <button
            type="button"
            onClick={closeMobile}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors active:bg-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search inside panel */}
        <div className="px-5 pt-4 pb-2">
          <form onSubmit={handleMobileSearch} className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={mobileSearch}
              onChange={(e) => setMobileSearch(e.target.value)}
              placeholder="Хайх..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition-all focus:border-amber-400 focus:bg-white"
              autoFocus={mobileMenuOpen}
            />
          </form>
        </div>

        {/* Nav links as cards */}
        <div className="px-5 py-3">
          <div className="grid grid-cols-3 gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobile}
                className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-2 py-4 text-center transition-colors active:bg-amber-50"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${link.color}`}
                >
                  <link.icon size={20} />
                </div>
                <span className="text-xs font-semibold text-gray-700">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Deals banner */}
        <div className="mx-5 mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3">
          <Flame size={20} className="shrink-0 text-white" />
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Today&apos;s Deals</p>
            <p className="text-xs text-white/80">Өнөөдрийн онцгой хямдрал</p>
          </div>
          <ChevronRight size={16} className="text-white/60" />
        </div>

        {/* Categories */}
        {mobileCategories.length > 0 && (
          <div className="px-5 pb-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Ангилал
              </h3>
              <Link
                href="/products"
                onClick={closeMobile}
                className="text-xs font-semibold text-amber-600"
              >
                Бүгд →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mobileCategories.map((cat, i) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.id}`}
                  onClick={closeMobile}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-3 transition-colors active:bg-gray-50"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${catColors[i % catColors.length]}`}
                  >
                    {cat.icon ? (
                      cat.icon.startsWith("data:image") ||
                      cat.icon.startsWith("http") ? (
                        <img
                          src={cat.icon}
                          alt=""
                          className="h-4 w-4 rounded-sm object-contain"
                        />
                      ) : (
                        <span className="text-sm">{cat.icon}</span>
                      )
                    ) : (
                      <ShoppingBasket size={16} />
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700 leading-tight">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors active:bg-gray-800"
          >
            <User size={16} />
            Нэвтрэх / Бүртгүүлэх
          </button>
        </div>
      </div>
    </header>
  );
};
