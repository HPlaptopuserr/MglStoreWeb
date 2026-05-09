"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Truck,
  LogOut,
  Users,
  ClipboardList,
  Megaphone,
  ScanLine,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ShoppingCart,
  Crown,
  X,
  BarChart2,
  RotateCcw,
} from "lucide-react";

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const navigation = [
  { name: "Хяналтын самбар", href: "/dashboard", icon: LayoutDashboard },
  { name: "Захиалгууд",       href: "/orders",    icon: ShoppingCart },
  { name: "POS касс",         href: "/pos",        icon: ScanLine,   posOnly: true },
  { name: "Өөрийн бүтээгдэхүүн", href: "/products", icon: Package },
  { name: "Нэгдсэн бараа",   href: "/supply-products", icon: Boxes,  supplyOnly: true },
  { name: "Үйлчилгээний постууд", href: "/service-posts", icon: Megaphone, serviceOnly: true },
  { name: "Буцаалт",          href: "/returns",   icon: RotateCcw },
  { name: "Борлуулалт",       href: "/sales",     icon: BarChart2 },
  { name: "Түгээгчийн мэдээлэл", href: "/drivers", icon: Users },
  { name: "Хүсэлтүүд",       href: "/requests",  icon: ClipboardList },
  { name: "Төлбөр",           href: "/payments",       icon: CreditCard },
  { name: "Card Terminal",    href: "/card-terminal",  icon: CreditCard },
  { name: "Pro Upgrade",      href: "/upgrade",        icon: Crown },
];

export interface VendorSidebarProps {
  onSignOut?: () => void;
  showPos?: boolean;
  showSupplyProducts?: boolean;
  showServicePosts?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function VendorSidebar({
  onSignOut,
  showPos = false,
  showSupplyProducts = false,
  showServicePosts = false,
  mobileOpen = false,
  onMobileClose,
}: VendorSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    onMobileClose?.();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredNavigation = navigation.filter((item) => {
    if ((item as any).posOnly)     return showPos;
    if ((item as any).supplyOnly)  return showSupplyProducts;
    if ((item as any).serviceOnly) return showServicePosts;
    return true;
  });

  // Mobile hides POS
  const mobileNavigation = filteredNavigation.filter(
    (item) => item.href !== "/pos",
  );

  const regularNav    = filteredNavigation.filter((i) => i.href !== "/upgrade");
  const upgradeNav    = filteredNavigation.filter((i) => i.href === "/upgrade");
  const mobileRegular = mobileNavigation.filter((i) => i.href !== "/upgrade");
  const mobileUpgrade = mobileNavigation.filter((i) => i.href === "/upgrade");

  const SidebarContent = ({
    nav,
    up,
    collapsed,
  }: {
    nav: typeof regularNav;
    up: typeof upgradeNav;
    collapsed: boolean;
  }) => (
    <>
      {/* Logo */}
      <div
        className={`flex h-16 items-center border-b border-white/10 ${
          collapsed ? "justify-center px-2" : "px-4"
        }`}
      >
        <div className={`flex items-center ${collapsed ? "" : "space-x-3"}`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFAD02] shadow-[0_0_15px_rgba(255,173,2,0.4)]">
            <Truck className="h-5 w-5 text-black" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                MGL<span className="text-[#FFAD02]">Store</span>
              </h1>
              <p className="text-[11px] font-medium text-white/40">Marrow</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav items */}
      <div
        className={`flex-1 overflow-y-auto py-4 ${collapsed ? "px-2" : "px-3"}`}
      >
        <nav className="space-y-1.5">
          {!collapsed && (
            <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wide text-white/30">
              Цэс
            </p>
          )}
          {nav.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const isPosActive = isActive && item.href === "/pos";
            return (
              <Link
                key={item.name}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={cn(
                  "group flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                  collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
                  isPosActive
                    ? "bg-emerald-500 text-white shadow-[0_0_22px_rgba(16,185,129,0.35)] ring-2 ring-emerald-300/40"
                    : isActive
                      ? "bg-[#FFAD02] text-black shadow-[0_0_20px_rgba(255,173,2,0.25)]"
                      : "text-white/60 hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    !collapsed && "mr-3",
                    isPosActive
                      ? "text-white"
                      : isActive
                        ? "text-black"
                        : "text-white/60 group-hover:text-white",
                  )}
                />
                {!collapsed && item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div
        className={`border-t border-white/10 ${collapsed ? "p-3" : "p-4"} space-y-2`}
      >
        {up.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "group flex items-center rounded-lg text-sm font-bold transition-all duration-200",
                collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
                isActive
                  ? "bg-[#FFAD02] text-black shadow-[0_0_20px_rgba(255,173,2,0.25)]"
                  : "bg-[#FFAD02]/15 text-[#FFAD02] hover:bg-[#FFAD02]/25",
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  !collapsed && "mr-3",
                  isActive ? "text-black" : "text-[#FFAD02]",
                )}
              />
              {!collapsed && item.name}
            </Link>
          );
        })}
        <button
          onClick={onSignOut}
          title={collapsed ? "Гарах" : undefined}
          className="group flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-sm font-semibold text-white/60 transition-all duration-200 hover:bg-red-500/20 hover:text-red-400"
        >
          <LogOut
            className={cn(
              "h-[18px] w-[18px] transition-transform group-hover:scale-110",
              !collapsed && "mr-3",
            )}
          />
          {!collapsed && "Гарах"}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <div
        className={`${
          isCollapsed ? "w-[84px]" : "w-[252px]"
        } hidden shrink-0 transition-all duration-300 md:block`}
      />
      <aside
        className={`${
          isCollapsed ? "w-[84px]" : "w-[252px]"
        } fixed left-0 top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-white/10 bg-black text-white transition-all duration-300 md:flex`}
      >
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed((p) => !p)}
          className="absolute -right-3 top-1/2 z-50 flex -translate-y-1/2 rounded-full border border-white/15 bg-black p-1 text-white/70 shadow-md transition-all hover:scale-105 hover:text-[#FFAD02]"
        >
          {isCollapsed ? (
            <ChevronRight className="h-6 w-6" />
          ) : (
            <ChevronLeft className="h-6 w-6" />
          )}
        </button>
        <SidebarContent
          nav={regularNav}
          up={upgradeNav}
          collapsed={isCollapsed}
        />
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={onMobileClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Drawer */}
          <aside
            className="absolute left-0 top-0 flex h-full w-72 flex-col bg-black text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onMobileClose}
              className="absolute right-3 top-3 rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <SidebarContent
              nav={mobileRegular}
              up={mobileUpgrade}
              collapsed={false}
            />
          </aside>
        </div>
      )}
    </>
  );
}
