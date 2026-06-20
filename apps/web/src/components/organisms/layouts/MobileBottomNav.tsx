"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Home, Search, ShoppingCart, User } from "lucide-react";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/hooks/useCart";

const LEFT_TABS = [
  { href: "/", label: "Нүүр", icon: Home, action: "link" },
  { href: "/reels", label: "Reels", icon: Clapperboard, action: "link" },
] as const;

const RIGHT_TABS = [
  { href: "/products", label: "Хайх", icon: Search, action: "search" },
  {
    href: ACCOUNT_ROUTES.profile,
    label: "Профайл",
    icon: User,
    action: "link",
  },
] as const;

const SHOPPING_ROUTE_PREFIXES = [
  "/",
  "/products",
  "/store",
  "/checkout",
  ACCOUNT_ROUTES.orders,
  ACCOUNT_ROUTES.profile,
  "/reels",
  "/services",
  "/our-services",
];

const NON_SHOPPING_ROUTE_PREFIXES = [
  "/company",
  "/projects",
  "/franchise",
  "/info",
  "/organizations",
  "/association",
  "/apply",
  "/forms",
];

function shouldShowMobileBottomNav(pathname: string) {
  if (
    NON_SHOPPING_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return false;
  }

  return SHOPPING_ROUTE_PREFIXES.some((prefix) =>
    prefix === "/" ? pathname === "/" : pathname.startsWith(prefix),
  );
}

export function MobileBottomNav({
  onCartOpen,
  onAuthOpen,
  onSearchOpen,
}: {
  onCartOpen: () => void;
  onAuthOpen: () => void;
  onSearchOpen: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { count } = useCart();

  if (!shouldShowMobileBottomNav(pathname)) {
    return null;
  }

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    if (href === ACCOUNT_ROUTES.profile) {
      return pathname === ACCOUNT_ROUTES.profile;
    }
    return path === "/" ? pathname === "/" : pathname.startsWith(path);
  };

  const handleProtected = (e: React.MouseEvent, href: string) => {
    const path = href.split("?")[0];
    if (!user && path === ACCOUNT_ROUTES.profile) {
      e.preventDefault();
      onAuthOpen();
    }
  };

  const renderTab = (tab: {
    href: string;
    label: string;
    icon: typeof Home;
    action: "link" | "search";
  }) => {
    const Icon = tab.icon;
    const active = isActive(tab.href);
    if (tab.action === "search") {
      return (
        <button
          key={tab.href}
          type="button"
          onClick={onSearchOpen}
          className={`relative flex h-full flex-1 flex-col items-center justify-center gap-[2px] transition-colors ${
            active ? "text-amber-600" : "text-gray-400 active:text-gray-600"
          }`}
        >
          <Icon size={18} strokeWidth={active ? 2.4 : 1.7} />
          <span
            className={`text-[9px] leading-none ${active ? "font-bold" : "font-medium"}`}
          >
            {tab.label}
          </span>
        </button>
      );
    }

    return (
      <Link
        key={tab.href}
        href={tab.href}
        onClick={(e) => handleProtected(e, tab.href)}
        className={`relative flex flex-col items-center justify-center gap-[2px] flex-1 h-full transition-colors ${
          active ? "text-amber-600" : "text-gray-400 active:text-gray-600"
        }`}
      >
        <Icon size={18} strokeWidth={active ? 2.4 : 1.7} />
        <span
          className={`text-[9px] leading-none ${active ? "font-bold" : "font-medium"}`}
        >
          {tab.label}
        </span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden safe-bottom">
      <div className="absolute inset-0 border-t border-slate-200/80 bg-white/95 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl" />

      <div className="relative flex h-[50px] items-center">
        {LEFT_TABS.map(renderTab)}

        <div className="flex flex-col items-center justify-center flex-1">
          <button
            type="button"
            onClick={onCartOpen}
            aria-label="Сагс нээх"
            className="relative -mt-2 flex h-[40px] w-[40px] items-center justify-center rounded-[14px] bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 text-white shadow-md shadow-amber-500/20 ring-[3px] ring-white transition-transform active:scale-95 sm:-mt-3 sm:h-[46px] sm:w-[46px] sm:rounded-[16px]"
          >
            <ShoppingCart size={18} strokeWidth={2} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white ring-2 ring-white sm:h-5 sm:min-w-[20px] sm:text-[10px]">
                {count}
              </span>
            )}
          </button>
          <span className="mt-[1px] text-[9px] font-medium text-gray-400">
            Сагс
          </span>
        </div>

        {RIGHT_TABS.map(renderTab)}
      </div>
    </nav>
  );
}
