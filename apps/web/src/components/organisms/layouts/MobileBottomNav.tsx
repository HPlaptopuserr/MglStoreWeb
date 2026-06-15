"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, Search, ShoppingCart, Package, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/hooks/useCart";

const LEFT_TABS = [
  { href: "/", label: "Нүүр", icon: Home, action: "link" },
  { href: "/products", label: "Хайх", icon: Search, action: "search" },
] as const;

const RIGHT_TABS = [
  { href: "/profile?tab=orders", label: "Захиалга", icon: Package, action: "link" },
  { href: "/profile", label: "Профайл", icon: User, action: "link" },
] as const;

const SHOPPING_ROUTE_PREFIXES = [
  "/",
  "/products",
  "/store",
  "/checkout",
  "/orders",
  "/profile",
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
  if (NON_SHOPPING_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
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
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { count } = useCart();

  if (!shouldShowMobileBottomNav(pathname)) {
    return null;
  }

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    if (href === "/profile?tab=orders") {
      return pathname === "/profile" && searchParams.get("tab") === "orders";
    }
    if (href === "/profile") {
      return pathname === "/profile" && searchParams.get("tab") !== "orders";
    }
    return path === "/" ? pathname === "/" : pathname.startsWith(path);
  };

  const handleProtected = (e: React.MouseEvent, href: string) => {
    const path = href.split("?")[0];
    if (!user && path === "/profile") {
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
          <Icon size={20} strokeWidth={active ? 2.4 : 1.7} />
          <span className={`text-[10px] leading-none ${active ? "font-bold" : "font-medium"}`}>
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
        <Icon size={20} strokeWidth={active ? 2.4 : 1.7} />
        <span className={`text-[10px] leading-none ${active ? "font-bold" : "font-medium"}`}>
          {tab.label}
        </span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden safe-bottom">
      <div className="absolute inset-0 border-t border-slate-200/80 bg-white/95 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl" />

      <div className="relative flex items-center h-[60px]">
        {LEFT_TABS.map(renderTab)}

        <div className="flex flex-col items-center justify-center flex-1">
          <button
            type="button"
            onClick={onCartOpen}
            aria-label="Сагс нээх"
            className="relative -mt-5 flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 text-white shadow-xl shadow-amber-500/30 ring-4 ring-white transition-transform active:scale-95"
          >
            <ShoppingCart size={22} strokeWidth={2} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white px-1 ring-2 ring-white">
                {count}
              </span>
            )}
          </button>
          <span className="text-[10px] font-medium text-gray-400 mt-[2px]">Сагс</span>
        </div>

        {RIGHT_TABS.map(renderTab)}
      </div>
    </nav>
  );
}
