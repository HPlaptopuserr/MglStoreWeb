"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShoppingCart,
  User,
  Search,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Flame,
  LogOut,
  Settings,
  Package,
  FolderKanban,
  GraduationCap,
  Building2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { SearchBar } from "../../molecules/SearchBar";
import { MegaMenu } from "@/components/organisms/MegaMenu";
import { PartnerMenu } from "@/components/organisms/home/PartnerMenu";
import { HrServicesMenu } from "@/components/organisms/home/HrServicesMenu";
import { CategoryIcon } from "@/components/atoms/CategoryIcon";
import { LoginModal } from "@/components/organisms/auth/LoginModal";
import { useBusinessCategories } from "@/hooks/useBusinessCategories";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { CATEGORY_COLORS, NAV_LINKS } from "@/lib/constants";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { CartDrawer } from "@/components/organisms/CartDrawer";
import {
  useAuth,
  type AuthOrganization,
  type AuthUser,
} from "@/lib/auth-context";
import { MobileBottomNav } from "@/components/organisms/layouts/MobileBottomNav";
import { API, resolveApiAssetUrl } from "@/lib/api";
import {
  AUTH_LOGIN_BANNER_KEY,
  createLoginMarketingBanner,
  parseLoginMarketingBanner,
} from "@/lib/site-banners";

const presentationPdfUrl = "/mgl-sma-taniltsuulga.pdf";

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [marketingBanner, setMarketingBanner] = useState(() =>
    createLoginMarketingBanner(),
  );
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, login, register, logout } = useAuth();
  const { count, total } = useCart();
  const { categories } = useBusinessCategories();
  const router = useRouter();
  const pathname = usePathname();
  const mobileNavLinks = NAV_LINKS;
  const isProfileRoute = pathname.startsWith("/profile");
  const isOrdersRoute = pathname.startsWith(ACCOUNT_ROUTES.orders);
  const hideBrowseNav =
    pathname.startsWith("/study") || isProfileRoute || isOrdersRoute;
  const hideSearch = isProfileRoute || isOrdersRoute;

  // Desktop category scroll
  const catScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkCatScroll = useCallback(() => {
    const el = catScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkCatScroll();
    const el = catScrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkCatScroll, { passive: true });
    const ro = new ResizeObserver(checkCatScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkCatScroll);
      ro.disconnect();
    };
  }, [categories, checkCatScroll]);

  const scrollCats = (dir: "left" | "right") => {
    catScrollRef.current?.scrollBy({
      left: dir === "left" ? -260 : 260,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    fetch(`${API}/site-settings`)
      .then((response) =>
        response.ok ? response.json() : ({} as Record<string, string>),
      )
      .then((settings) => {
        setMarketingBanner(
          parseLoginMarketingBanner(settings?.[AUTH_LOGIN_BANNER_KEY]),
        );
      })
      .catch(() => {
        setMarketingBanner(createLoginMarketingBanner());
      });
  }, []);

  useLockBodyScroll(authOpen || mobileMenuOpen || mobileSearchOpen);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const submitMobileSearch = (value = mobileSearch) => {
    const query = value.trim();
    if (!query) return;
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
    setMobileSearch("");
    router.push(`/products?search=${encodeURIComponent(query)}`);
  };

  const closeMobile = () => setMobileMenuOpen(false);
  const openMobileSearch = () => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(true);
  };
  const closeMobileSearch = () => setMobileSearchOpen(false);

  const openAuthModal = () => {
    setAuthError("");
    setAuthOpen(true);
  };

  const closeAuthModal = () => {
    setAuthOpen(false);
    setAuthError("");
  };

  const handleLogout = () => {
    logout();
    closeAuthModal();
    setUserDropdownOpen(false);
    closeMobile();
  };

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 flex max-w-full flex-col bg-white/95 shadow-sm backdrop-blur-md">
        <div className="border-b border-slate-100">
          <div className="container mx-auto flex h-14 min-w-0 items-center justify-between gap-1.5 px-2.5 md:h-16 md:gap-6 md:px-4">
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

            <div className="flex min-w-0 shrink items-center gap-2 md:shrink-0">
              <Link href="/" onClick={closeMobile}>
                <Image
                  src="/logo.png"
                  alt="MglStore Logo"
                  width={140}
                  height={52}
                  className="h-auto w-[96px] object-contain min-[360px]:w-[112px] sm:w-[140px] md:w-[160px]"
                  priority
                />
              </Link>
              <div className="hidden items-center gap-8 sm:flex py-3">
                <div className="h-8 w-px bg-gradient-to-b from-transparent via-amber-400 to-transparent" />
                <a
                  href={presentationPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-11 max-w-[270px] items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 text-sm font-black text-slate-900 shadow-sm shadow-emerald-100/40 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-4 lg:max-w-[310px]"
                  title="MGL Store нэгдсэн танилцуулга үзэх"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100">
                    <Building2 size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate leading-tight">
                      MGL Business
                    </span>
                    <span className="block truncate text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                      Нэгдсэн танилцуулга
                    </span>
                  </span>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-amber-500 transition-transform group-hover:translate-x-0.5"
                  />
                </a>
              </div>
            </div>

            <div
              className={`hidden max-w-3xl flex-1 items-center justify-center md:flex ${hideSearch ? "md:hidden" : ""}`}
            >
              <SearchBar />
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-6">
              <a
                href={presentationPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm transition active:scale-95 active:bg-emerald-100 sm:hidden"
                aria-label="MGL Business"
              >
                <Building2 size={17} />
              </a>

              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="relative flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full bg-amber-500 px-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-amber-600 sm:h-auto sm:gap-2 sm:px-5 sm:py-2.5 sm:text-base"
              >
                <ShoppingCart size={16} className="sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">
                  ₮{total > 0 ? total.toLocaleString() : "0"}
                </span>
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white px-1 shadow">
                    {count}
                  </span>
                )}
              </button>

              {user ? (
                <div className="relative hidden sm:block" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-xs font-bold text-white">
                      {user.fullName?.trim()?.[0]?.toUpperCase() ||
                        user.email?.[0]?.toUpperCase() ||
                        "?"}
                    </div>
                    <span className="max-w-[140px] truncate">
                      {user.fullName?.trim() || user.email}
                    </span>
                  </button>

                  {userDropdownOpen && (
                    <HeaderAccountDropdown
                      onClose={() => setUserDropdownOpen(false)}
                      onLogout={handleLogout}
                      user={user}
                    />
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="hidden items-center gap-2 text-sm font-medium uppercase text-slate-700 hover:text-amber-600 sm:flex"
                >
                  <User size={22} />
                  <span>Нэвтрэх</span>
                </button>
              )}

              <button
                type="button"
                onClick={user ? () => router.push(ACCOUNT_ROUTES.profile) : openAuthModal}
                aria-label={user ? "Профайл цэс" : "Нэвтрэх"}
                className={`relative hidden h-9 w-9 items-center justify-center rounded-xl transition-colors active:bg-gray-100 min-[360px]:flex sm:hidden ${
                  user
                    ? "bg-slate-950 text-white shadow-md shadow-slate-200"
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                {user?.avatarUrl ? (
                  <HeaderAvatar
                    label={user.fullName || user.email || "Profile"}
                    src={user.avatarUrl}
                    className="h-full w-full rounded-xl"
                  />
                ) : user ? (
                  <span className="text-xs font-black">
                    {user.fullName?.trim()?.[0]?.toUpperCase() ||
                      user.email?.[0]?.toUpperCase() ||
                      "M"}
                  </span>
                ) : (
                  <User size={18} />
                )}
                {user ? (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                ) : null}
              </button>
            </div>
          </div>
        </div>

        {!hideSearch && (
          <div className="w-full max-w-full overflow-hidden border-b border-slate-100 bg-white px-3 py-2 md:hidden">
            <button
              type="button"
              onClick={openMobileSearch}
              className="relative flex h-10 w-full max-w-full min-w-0 items-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 px-3 text-left text-sm font-semibold text-slate-400 shadow-sm transition active:scale-[0.99] active:bg-white min-[360px]:h-11"
            >
              <Search size={16} className="mr-2 shrink-0 text-gray-400" />
              <span className="min-w-0 flex-1 truncate">
                Бүтээгдэхүүн хайх...
              </span>
              <span className="ml-2 hidden shrink-0 rounded-xl bg-slate-200 px-2.5 py-1.5 text-xs font-black text-slate-500 min-[360px]:inline-flex">
                Хайх
              </span>
            </button>
          </div>
        )}

        {!hideBrowseNav && categories.length > 0 && (
          <div
            className="scrollbar-hide flex w-full max-w-full gap-2 overflow-x-auto overscroll-x-contain border-b border-gray-100 px-3 py-2 md:hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.id}`}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors active:bg-amber-50 active:border-amber-300 active:text-amber-700"
              >
                <CategoryIcon category={cat} size={12} />
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {!hideBrowseNav && (
          <div className="relative hidden border-t border-gray-100 md:block">
            <div className="container mx-auto flex h-14 items-center gap-8 px-4">
              <div className="flex h-12 items-center gap-8">
                <MegaMenu />
                <PartnerMenu />
                <HrServicesMenu />
                <Link
                  href="/study"
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                    pathname.startsWith("/study")
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  <GraduationCap size={14} />
                  Сургалт
                </Link>
                <Link
                  href="/franchise"
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                    pathname.startsWith("/franchise")
                      ? "bg-cyan-50 text-cyan-700"
                      : "text-gray-600 hover:bg-cyan-50 hover:text-cyan-700"
                  }`}
                >
                  <FolderKanban size={14} />
                  Франчайз
                </Link>
                <Link
                  href="/projects"
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                    pathname.startsWith("/projects")
                      ? "bg-violet-50 text-violet-700"
                      : "text-gray-600 hover:bg-violet-50 hover:text-violet-700"
                  }`}
                >
                  <FolderKanban size={14} />
                  Төсөл
                </Link>
              </div>

              {categories.length > 0 && (
                <div className="relative flex-1 min-w-0">
                  {canScrollLeft && (
                    <button
                      onClick={() => scrollCats("left")}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white shadow border border-gray-200 text-gray-500 hover:text-black hover:shadow-md transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  )}
                  <div
                    ref={catScrollRef}
                    className="flex items-center gap-1 overflow-x-auto px-8"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/products?category=${cat.id}`}
                        className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-orange-50 hover:text-orange-600"
                      >
                        <CategoryIcon category={cat} size={14} />
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                  {canScrollRight && (
                    <button
                      onClick={() => scrollCats("right")}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white shadow border border-gray-200 text-gray-500 hover:text-black hover:shadow-md transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div
          className={`fixed inset-0 z-[180] bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
            mobileMenuOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          onClick={closeMobile}
        />

        <div
          className={`fixed inset-0 z-[190] flex h-dvh flex-col overflow-hidden bg-white shadow-2xl transition-transform duration-300 ease-out md:hidden ${
            mobileMenuOpen ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] backdrop-blur-sm">
            <Link
              href="/"
              onClick={closeMobile}
              className="flex items-center gap-2.5"
            >
              <Image
                src="/logo.png"
                alt="MglStore"
                width={96}
                height={34}
                className="object-contain"
                style={{ width: 90, height: "auto" }}
              />
              <span className="text-base font-bold text-gray-900">
                MGL Store
              </span>
            </Link>
            <button
              type="button"
              onClick={closeMobile}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors active:bg-gray-200"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-4"
            style={{ scrollbarWidth: "none" }}
          >
            <a
              href={presentationPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMobile}
              className="mb-4 flex items-center gap-3 rounded-3xl border border-emerald-100 bg-white px-4 py-3.5 shadow-sm transition active:scale-[0.99] active:bg-emerald-50"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm">
                <Building2 size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-slate-950">
                  MGL Business
                </span>
                <span className="mt-0.5 block truncate text-xs font-bold text-slate-500">
                  Танилцуулга, ажил, сургалт
                </span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-amber-500" />
            </a>

            {!hideSearch && (
              <button
                type="button"
                onClick={openMobileSearch}
                className="relative flex h-[52px] w-full items-center rounded-2xl border border-slate-200 bg-white px-4 text-left text-[15px] font-semibold text-slate-400 shadow-sm transition active:scale-[0.99] active:bg-slate-50"
              >
                <Search size={17} className="mr-3 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate">
                  Бараа, үйлчилгээ, төсөл хайх...
                </span>
                <span className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">
                  Хайх
                </span>
              </button>
            )}

            <div className="mt-5">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-500">
                    Explore
                  </p>
                  <h3 className="mt-1 text-lg font-black leading-tight text-slate-950">
                    Үндсэн хэсгүүд
                  </h3>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-400 shadow-sm ring-1 ring-slate-200">
                  {mobileNavLinks.length}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {mobileNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobile}
                    className="group relative flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2.5 text-center shadow-sm transition active:scale-[0.98] active:border-orange-200 active:bg-orange-50"
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${link.color}`}
                    >
                      <link.icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-black leading-tight text-slate-900">
                        {link.label}
                      </p>
                      <p className="mt-0.5 hidden text-[10px] font-semibold leading-3 text-slate-500 min-[390px]:line-clamp-1 min-[390px]:block">
                        {link.desc}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {categories.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Бүтээгдэхүүний ангилал
                  </h3>
                  <Link
                    href="/products"
                    onClick={closeMobile}
                    className="text-xs font-black text-orange-600"
                  >
                    Бүгд →
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {categories.slice(0, 8).map((cat, i) => (
                    <Link
                      key={cat.id}
                      href={`/products?category=${cat.id}`}
                      onClick={closeMobile}
                      className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition active:bg-slate-50"
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`}
                      >
                        <CategoryIcon category={cat} size={16} />
                      </div>
                      <span className="truncate text-sm font-bold leading-tight text-slate-700">
                        {cat.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <Link
              href="/products"
              onClick={closeMobile}
              className="mt-6 flex items-center gap-3 rounded-3xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-4 shadow-lg shadow-orange-200"
            >
              <Flame size={22} className="shrink-0 text-white" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white">
                  Өнөөдрийн онцлох саналууд
                </p>
                <p className="mt-0.5 text-xs font-semibold text-white/80">
                  Бүтээгдэхүүн, үйлчилгээ, боломжуудыг үзэх
                </p>
              </div>
              <ChevronRight size={18} className="text-white/75" />
            </Link>

            <div className="mt-5 border-t border-slate-200 pt-4">
              {user ? (
                <div className="grid gap-2.5">
                  <Link
                    href={ACCOUNT_ROUTES.profile}
                    onClick={closeMobile}
                    className="flex items-center gap-3 rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-3.5 shadow-sm"
                  >
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-sm font-black text-white">
                      <HeaderAvatar
                        label={user.fullName || user.email || "Хэрэглэгч"}
                        src={user.avatarUrl}
                        className="h-full w-full rounded-2xl"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-950">
                        {user.fullName?.trim() || user.email || "Хэрэглэгч"}
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-emerald-600">
                        ● Нэвтэрсэн
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-emerald-500" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      const confirmed = window.confirm("Гарах уу?");
                      if (confirmed) handleLogout();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-600 transition-colors active:bg-red-100"
                  >
                    <LogOut size={16} />
                    Гарах
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-slate-200 transition-colors active:bg-slate-800"
                >
                  <User size={16} />
                  Нэвтрэх / Бүртгүүлэх
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {authOpen && (
        <LoginModal
          open={authOpen}
          onClose={closeAuthModal}
          onLogin={async (identifier, password, options) => {
            setAuthError("");
            setAuthLoading(true);
            try {
              const result = await login(identifier, password, options);
              if (result?.requiresEmailOtp) return result;
              closeAuthModal();
              closeMobile();
            } catch (err: unknown) {
              const msg =
                err instanceof Error ? err.message : "Нэвтрэхэд алдаа гарлаа.";
              setAuthError(msg);
            } finally {
              setAuthLoading(false);
            }
          }}
          onRegister={async (fullName, identifier, password, options) => {
            setAuthError("");
            setAuthLoading(true);
            try {
              await register(fullName, identifier, password, options);
              closeAuthModal();
              closeMobile();
            } catch (err: unknown) {
              const msg =
                err instanceof Error
                  ? err.message
                  : "Бүртгүүлэхэд алдаа гарлаа.";
              setAuthError(msg);
            } finally {
              setAuthLoading(false);
            }
          }}
          isLoading={authLoading}
          error={authError}
          marketingBanner={marketingBanner}
        />
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <MobileSearchSheet
        open={mobileSearchOpen}
        query={mobileSearch}
        categories={categories}
        onQueryChange={setMobileSearch}
        onClose={closeMobileSearch}
        onSubmit={submitMobileSearch}
        onNavigate={(href) => {
          setMobileSearch("");
          closeMobileSearch();
          router.push(href);
        }}
      />
      {!mobileMenuOpen && !authOpen && (
        <React.Suspense fallback={null}>
          <MobileBottomNav
            onCartOpen={() => setCartOpen(true)}
            onAuthOpen={openAuthModal}
            onSearchOpen={openMobileSearch}
          />
        </React.Suspense>
      )}
    </>
  );
};

const popularSearchTerms = [
  "хүнс",
  "кофе",
  "супермаркет",
  "бэлэг",
  "гоо сайхан",
  "хувцас",
  "захиалга",
  "хямдрал",
];

function MobileSearchSheet({
  open,
  query,
  categories,
  onQueryChange,
  onClose,
  onSubmit,
  onNavigate,
}: {
  open: boolean;
  query: string;
  categories: ReturnType<typeof useBusinessCategories>["categories"];
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (query: string) => void;
  onNavigate: (href: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const runTermSearch = (term: string) => {
    onQueryChange(term);
    onNavigate(`/products?search=${encodeURIComponent(term)}`);
  };

  return (
    <div
      className={`fixed inset-0 z-[120] bg-slate-950/45 backdrop-blur-sm transition-opacity duration-200 md:hidden ${
        open
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`mx-auto flex h-dvh w-full max-w-[430px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "-translate-y-5"
        }`}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(query);
          }}
          className="flex items-center gap-2.5 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+10px)]"
        >
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                onSubmit(event.currentTarget.value);
              }}
              placeholder="Search"
              className="h-11 w-full rounded-full bg-slate-100 pl-10 pr-9 text-[15px] font-bold text-slate-950 outline-none transition placeholder:text-slate-500 focus:bg-slate-50 focus:ring-2 focus:ring-orange-200"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition active:bg-slate-200"
                aria-label="Хайлтыг цэвэрлэх"
              >
                <X size={16} />
              </button>
            )}
          </label>
          <button
            type="button"
            onClick={onClose}
            className="h-10 shrink-0 px-1 text-sm font-black text-slate-950"
          >
            Cancel
          </button>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+76px)] pt-5">
          <button
            type="button"
            onClick={() => onNavigate("/organizations")}
            className="mb-6 flex w-full items-center gap-3 rounded-2xl bg-white text-left transition active:scale-[0.99]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-lime-200 bg-lime-100 text-slate-950 shadow-inner">
              <Sparkles size={22} />
            </span>
            <span className="text-base font-black text-slate-950">
              MGL Store AI
            </span>
          </button>

          <section>
            <h3 className="mb-3 text-sm font-bold text-slate-500">
              Popular Search Terms
            </h3>
            <div className="flex flex-wrap gap-2">
              {popularSearchTerms.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => runTermSearch(term)}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-950 transition active:scale-95 active:bg-slate-200"
                >
                  {term}
                </button>
              ))}
            </div>
          </section>

          {categories.length > 0 && (
            <section className="mt-6">
              <h3 className="mb-3 text-sm font-bold text-slate-500">
                Ангиллууд
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {categories.slice(0, 8).map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      onNavigate(`/products?category=${category.id}`)
                    }
                    className="flex h-12 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-left shadow-sm transition active:bg-slate-50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                      <CategoryIcon category={category} size={14} />
                    </span>
                    <span className="truncate text-xs font-black text-slate-700">
                      {category.name}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

const headerRoleLabel: Record<string, string> = {
  OWNER: "Эзэмшигч",
  ADMIN: "Админ",
  STAFF: "Ажилтан",
  VIEWER: "Ажиглагч",
};

function getHeaderOrganizations(user: AuthUser): AuthOrganization[] {
  if (Array.isArray(user.organizations) && user.organizations.length > 0) {
    return user.organizations;
  }

  if (!user.organizationId || !user.orgRole) return [];

  return [
    {
      id: user.organizationId,
      name: user.organizationName || "Байгууллага",
      role: user.orgRole,
      isPrimary: true,
    },
  ];
}

function getAccountInitials(value?: string | null) {
  return (value || "?").trim()[0]?.toUpperCase() || "?";
}

function HeaderAccountDropdown({
  onClose,
  onLogout,
  user,
}: {
  onClose: () => void;
  onLogout: () => void;
  user: AuthUser;
}) {
  const displayName = user.fullName?.trim() || user.email || "Хэрэглэгч";
  const organizations = getHeaderOrganizations(user);
  const featuredOrganizations = organizations.slice(0, 2);

  return (
    <div className="absolute right-0 top-full z-50 mt-3 w-[340px] overflow-hidden rounded-[24px] border border-slate-200 bg-white p-3 text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/5">
      <div className="rounded-[20px] bg-slate-50 p-2 ring-1 ring-slate-200/80">
        <Link
          href={ACCOUNT_ROUTES.profile}
          onClick={onClose}
          className="flex items-center gap-3 rounded-[17px] bg-white px-3 py-3 shadow-sm shadow-slate-200/60 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-orange-200"
        >
          <HeaderAvatar
            label={displayName}
            src={user.avatarUrl}
            className="h-12 w-12"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-black leading-tight text-slate-950">
              {displayName}
            </p>
            <p className="mt-0.5 truncate text-xs font-bold text-slate-500">
              {user.email || user.phone || "Personal profile"}
            </p>
          </div>
        </Link>

        {featuredOrganizations.length > 0 && (
          <>
            <div className="mx-3 my-2.5 h-px bg-slate-200" />
            <div className="space-y-2">
              {featuredOrganizations.map((org) => (
                <Link
                  key={org.id}
                  href={`/profile/organizations/${encodeURIComponent(org.id)}`}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-orange-50 hover:ring-orange-200"
                >
                  <HeaderAvatar
                    label={org.name}
                    src={org.logoUrl}
                    icon={<Building2 size={22} />}
                    className="h-11 w-11 bg-orange-50 text-orange-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-950">
                      {org.name}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                      <ShieldCheck size={12} />
                      {headerRoleLabel[org.role] || org.role}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </Link>
              ))}
            </div>
          </>
        )}

        {organizations.length > featuredOrganizations.length && (
          <>
            <div className="mx-3 my-2.5 h-px bg-slate-200" />
            <Link
              href={ACCOUNT_ROUTES.profile}
              onClick={onClose}
              className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-slate-900 text-sm font-black text-white transition hover:bg-orange-600"
            >
              <RefreshCcw size={17} />
              Бүх profile харах ({organizations.length})
            </Link>
          </>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <HeaderMenuLink
          href={ACCOUNT_ROUTES.orders}
          icon={<Package size={19} />}
          label="Миний захиалгууд"
          onClick={onClose}
        />
        <HeaderMenuLink
          href={ACCOUNT_ROUTES.profileSettings}
          icon={<Settings size={19} />}
          label="Settings & privacy"
          onClick={onClose}
        />
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-[16px] px-2 py-2.5 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
            <LogOut size={19} />
          </span>
          <span className="flex-1">Гарах</span>
        </button>
      </div>
    </div>
  );
}

function HeaderAvatar({
  className,
  icon,
  label,
  src,
}: {
  className?: string;
  icon?: React.ReactNode;
  label: string;
  src?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const imageSrc = src && !failed ? resolveApiAssetUrl(src) : "";

  if (imageSrc) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-sm font-black text-white ${className || ""}`}
      >
        <img
          src={imageSrc}
          alt=""
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-sm font-black text-white ${className || ""}`}
    >
      {icon || getAccountInitials(label)}
    </span>
  );
}

function HeaderMenuLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-[16px] px-2 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <ChevronRight size={19} className="text-slate-400" />
    </Link>
  );
}
