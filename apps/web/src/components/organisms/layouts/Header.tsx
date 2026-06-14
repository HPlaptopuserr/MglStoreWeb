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
  Loader2,
  Settings,
  Package,
  FolderKanban,
  GraduationCap,
  Building2,
  RefreshCcw,
  ShieldCheck,
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
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { CartDrawer } from "@/components/organisms/CartDrawer";
import { useAuth, type AuthOrganization, type AuthUser } from "@/lib/auth-context";
import { MobileBottomNav } from "@/components/organisms/layouts/MobileBottomNav";
import { API, resolveApiAssetUrl } from "@/lib/api";
import {
  AUTH_LOGIN_BANNER_KEY,
  createLoginMarketingBanner,
  parseLoginMarketingBanner,
} from "@/lib/site-banners";

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");
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
  const hideBrowseNav = pathname.startsWith("/study") || isProfileRoute;
  const hideSearch = isProfileRoute;

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

  useLockBodyScroll(authOpen || mobileMenuOpen);

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

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = mobileSearch.trim();
    if (!query) return;
    setMobileMenuOpen(false);
    setMobileSearch("");
    router.push(`/products?search=${encodeURIComponent(query)}`);
  };

  const closeMobile = () => setMobileMenuOpen(false);

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
      <header className="fixed left-0 right-0 top-0 z-50 flex flex-col bg-white/95 shadow-sm backdrop-blur-md">
        <div className="border-b border-slate-100">
          <div className="container mx-auto flex h-14 min-w-0 items-center justify-between gap-2 px-3 md:h-16 md:gap-6 md:px-4">
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
                  className="h-auto w-[112px] object-contain sm:w-[140px] md:w-[160px]"
                  priority
                />
              </Link>
              <div className="hidden items-center gap-8 sm:flex py-3">
                <div className="h-8 w-px bg-gradient-to-b from-transparent via-amber-400 to-transparent" />
                <a
                  href="/MGL.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="max-w-[300px] font-[family-name:var(--font-marck-script)] text-[15px] leading-[1.3] text-gray-900 transition-colors hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-4"
                >
                  MGL Store нэгдсэн танилцуулга үзэх
                </a>
              </div>
            </div>

            <div className={`hidden max-w-3xl flex-1 items-center justify-center md:flex ${hideSearch ? "md:hidden" : ""}`}>
              <SearchBar />
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-6">
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
                onClick={
                  user ? () => setMobileMenuOpen((open) => !open) : openAuthModal
                }
                aria-label={user ? "Профайл цэс" : "Нэвтрэх"}
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors active:bg-gray-100 sm:hidden ${
                  user
                    ? "bg-slate-950 text-white shadow-md shadow-slate-200"
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                {user?.avatarUrl ? (
                  <img
                    src={resolveApiAssetUrl(user.avatarUrl)}
                    alt={user.fullName || "Profile"}
                    className="h-full w-full rounded-xl object-cover"
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
        <div className="border-b border-slate-100 px-4 py-2 md:hidden">
          <form onSubmit={handleMobileSearch} className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={mobileSearch}
              onChange={(e) => setMobileSearch(e.target.value)}
              placeholder="Бүтээгдэхүүн хайх..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-16 text-sm text-gray-900 outline-none transition-all focus:border-amber-400 focus:bg-white focus:shadow-sm"
            />
            <button
              type="submit"
              disabled={!mobileSearch.trim()}
              className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-lg bg-orange-500 px-3 text-xs font-black text-white transition active:scale-95 disabled:bg-slate-200 disabled:text-slate-400"
            >
              Хайх
            </button>
          </form>
        </div>
        )}

        {!hideBrowseNav && categories.length > 0 && (
          <div
            className="flex gap-2 overflow-x-auto border-b border-gray-100 px-4 py-2 md:hidden"
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
          className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
            mobileMenuOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          onClick={closeMobile}
        />

        <div
          className={`fixed inset-x-0 top-0 z-50 max-h-[85vh] overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out md:hidden ${
            mobileMenuOpen ? "translate-y-0" : "-translate-y-full"
          }`}
          style={{ scrollbarWidth: "none" }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-3.5 backdrop-blur-sm">
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

          {!hideSearch && (
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
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-16 text-sm text-gray-900 outline-none transition-all focus:border-amber-400 focus:bg-white"
                autoFocus={mobileMenuOpen}
              />
              <button
                type="submit"
                disabled={!mobileSearch.trim()}
                className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-lg bg-orange-500 px-3 text-xs font-black text-white transition active:scale-95 disabled:bg-slate-200 disabled:text-slate-400"
              >
                Хайх
              </button>
            </form>
          </div>
          )}

          <div className="px-5 py-3">
            <div className="grid grid-cols-3 gap-2">
              {mobileNavLinks.map((link) => (
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

          <div className="border-y border-gray-100 px-5 py-4">
            {user ? (
              <div className="grid gap-2">
                <Link
                  href="/profile"
                  onClick={closeMobile}
                  className="flex items-center gap-3 rounded-2xl bg-green-50 px-4 py-3"
                >
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-sm font-bold text-white">
                    {user.avatarUrl ? (
                      <img
                        src={resolveApiAssetUrl(user.avatarUrl)}
                        alt={user.fullName || "Profile"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      user.fullName?.trim()?.[0]?.toUpperCase() ||
                      user.email?.[0]?.toUpperCase() ||
                      "?"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {user.fullName?.trim() || user.email || "Хэрэглэгч"}
                    </p>
                    <p className="text-xs font-medium text-green-600">
                      ● Нэвтэрсэн
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const confirmed = window.confirm("Гарах уу?");
                    if (confirmed) handleLogout();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition-colors active:bg-red-100"
                >
                  <LogOut size={16} />
                  Гарах
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors active:bg-gray-800"
              >
                <User size={16} />
                Нэвтрэх / Бүртгүүлэх
              </button>
            )}
          </div>

          <div className="mx-5 mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3">
            <Flame size={20} className="shrink-0 text-white" />
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Today&apos;s Deals</p>
              <p className="text-xs text-white/80">Өнөөдрийн онцгой хямдрал</p>
            </div>
            <ChevronRight size={16} className="text-white/60" />
          </div>

          {categories.length > 0 && (
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
                {categories.map((cat, i) => (
                  <Link
                    key={cat.id}
                    href={`/products?category=${cat.id}`}
                    onClick={closeMobile}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-3 transition-colors active:bg-gray-50"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`}
                    >
                      <CategoryIcon category={cat} size={16} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 leading-tight">
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

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
          onRegister={async (fullName, identifier, password) => {
            setAuthError("");
            setAuthLoading(true);
            try {
              await register(fullName, identifier, password);
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
      <React.Suspense fallback={null}>
        <MobileBottomNav
          onCartOpen={() => setCartOpen(true)}
          onAuthOpen={openAuthModal}
        />
      </React.Suspense>
    </>
  );
};

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
          href="/profile"
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
              href="/profile"
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
          href="/profile?tab=orders"
          icon={<Package size={19} />}
          label="Миний захиалгууд"
          onClick={onClose}
        />
        <HeaderMenuLink
          href="/profile/settings"
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
  if (src) {
    return (
      <span
        className={`shrink-0 overflow-hidden rounded-full bg-slate-100 ${className || ""}`}
      >
        <img
          src={resolveApiAssetUrl(src)}
          alt=""
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
