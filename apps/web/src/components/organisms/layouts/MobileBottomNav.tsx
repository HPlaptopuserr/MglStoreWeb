"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingCart, Package, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/hooks/useCart";

const LEFT_TABS = [
  { href: "/", label: "Нүүр", icon: Home },
  { href: "/products", label: "Хайх", icon: Search },
] as const;

const RIGHT_TABS = [
  { href: "/profile?tab=orders", label: "Захиалга", icon: Package },
  { href: "/profile", label: "Профайл", icon: User },
] as const;

export function MobileBottomNav({
  onCartOpen,
  onAuthOpen,
}: {
  onCartOpen: () => void;
  onAuthOpen: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { count } = useCart();

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    return path === "/" ? pathname === "/" : pathname.startsWith(path);
  };

  const handleProtected = (e: React.MouseEvent, href: string) => {
    const path = href.split("?")[0];
    if (!user && path === "/profile") {
      e.preventDefault();
      onAuthOpen();
    }
  };

  const renderTab = (tab: { href: string; label: string; icon: typeof Home }) => {
    const Icon = tab.icon;
    const active = isActive(tab.href);
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
      {/* Background bar */}
      <div className="absolute inset-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]" />

      <div className="relative flex items-center h-[60px]">
        {/* Left tabs */}
        {LEFT_TABS.map(renderTab)}

        {/* Center cart button — elevated */}
        <div className="flex flex-col items-center justify-center flex-1">
          <button
            type="button"
            onClick={onCartOpen}
            className="relative -mt-5 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30 active:scale-95 transition-transform"
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

        {/* Right tabs */}
        {RIGHT_TABS.map(renderTab)}
      </div>
    </nav>
  );
}
