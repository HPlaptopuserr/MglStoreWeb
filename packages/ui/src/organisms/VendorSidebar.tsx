"use client";

import { useState } from "react";
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
} from "lucide-react";

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const navigation = [
  { name: "Хяналтын самбар", href: "/dashboard", icon: LayoutDashboard },
  { name: "Захиалгууд", href: "/orders", icon: ShoppingCart },
  { name: "POS касс", href: "/pos", icon: ScanLine },
  { name: "Өөрийн бүтээгдэхүүн", href: "/products", icon: Package },
  { name: "Нэгдсэн бараа", href: "/supply-products", icon: Boxes },
  { name: "Үйлчилгээний постууд", href: "/service-posts", icon: Megaphone },
  { name: "Түгээгчийн мэдээлэл", href: "/drivers", icon: Users },
  { name: "Хүсэлтүүд", href: "/requests", icon: ClipboardList },
  { name: "Төлбөр", href: "/payments", icon: CreditCard },
  { name: "Pro Upgrade", href: "/upgrade", icon: Crown },
];

export interface VendorSidebarProps {
  onSignOut?: () => void;
  showPos?: boolean;
  showSupplyProducts?: boolean;
  showServicePosts?: boolean;
}

export function VendorSidebar({ onSignOut, showPos = false, showSupplyProducts = false, showServicePosts = false }: VendorSidebarProps) {
  const filteredNavigation = navigation.filter((item) => {
    if (item.href === "/pos") return showPos;
    if (item.href === "/supply-products") return showSupplyProducts;
    if (item.href === "/service-posts") return showServicePosts;
    return true;
  });

  const regularNav = filteredNavigation.filter((item) => item.href !== "/upgrade");
  const upgradeNav = filteredNavigation.filter((item) => item.href === "/upgrade");
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
    <div
      className={`${isCollapsed ? "w-[84px]" : "w-[252px]"} shrink-0 transition-all duration-300 hidden md:block`}
      style={{ width: isCollapsed ? 84 : 252 }}
    />
    <aside
      className={`${
        isCollapsed ? "w-[84px]" : "w-[252px]"
      } fixed left-0 top-0 z-40 flex h-screen shrink-0 flex-col border-r border-white/10 bg-black text-white transition-all duration-300 hidden md:flex`}
    >
      <button
        type="button"
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="absolute -right-3 top-1/2 z-50 flex -translate-y-1/2 rounded-full border border-white/15 bg-black p-1 text-white/70 shadow-md transition-all hover:scale-105 hover:text-[#FFAD02]"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-6 w-6" />
        ) : (
          <ChevronLeft className="h-6 w-6" />
        )}
      </button>

      <div className={`flex h-16 items-center border-b border-white/10 ${isCollapsed ? "justify-center px-2" : "px-4"}`}>
        <div className={`flex items-center ${isCollapsed ? "" : "space-x-3"}`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFAD02] shadow-[0_0_15px_rgba(255,173,2,0.4)]">
            <Truck className="h-5 w-5 text-black" />
          </div>

          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                MGL<span className="text-[#FFAD02]">Store</span>
              </h1>
              <p className="text-[11px] font-medium text-white/40">
                Marrow
              </p>
            </div>
          )}
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto py-4 ${isCollapsed ? "px-2" : "px-3"}`}>
        <nav className="space-y-2">
          {!isCollapsed && (
            <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wide text-white/30">
              Цэс
            </p>
          )}

          {regularNav.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const isPosActive = isActive && item.href === "/pos";

            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  "group flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                  isCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
                  isPosActive
                    ? "bg-emerald-500 text-white shadow-[0_0_22px_rgba(16,185,129,0.35)] ring-2 ring-emerald-300/40"
                    : isActive
                    ? "bg-[#FFAD02] text-black shadow-[0_0_20px_rgba(255,173,2,0.25)]"
                    : "text-white/60 hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon
                  className={cn(
                    "h-4.5 w-4.5 shrink-0",
                    !isCollapsed && "mr-3",
                    isPosActive
                      ? "text-white"
                      : isActive
                      ? "text-black"
                      : "text-white/60 group-hover:text-white",
                  )}
                />
                {!isCollapsed && item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={`border-t border-white/10 ${isCollapsed ? "p-3" : "p-4"} space-y-2`}>
        {upgradeNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={cn(
                "group flex items-center rounded-lg text-sm font-bold transition-all duration-200",
                isCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
                isActive
                  ? "bg-[#FFAD02] text-black shadow-[0_0_20px_rgba(255,173,2,0.25)]"
                  : "bg-[#FFAD02]/15 text-[#FFAD02] hover:bg-[#FFAD02]/25",
              )}
            >
              <item.icon
                className={cn(
                  "h-4.5 w-4.5 shrink-0",
                  !isCollapsed && "mr-3",
                  isActive ? "text-black" : "text-[#FFAD02]",
                )}
              />
              {!isCollapsed && item.name}
            </Link>
          );
        })}
        <button
          onClick={onSignOut}
          title={isCollapsed ? "Гарах" : undefined}
          className="group flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-sm font-semibold text-white/60 transition-all duration-200 hover:bg-red-500/20 hover:text-red-400"
        >
          <LogOut
            className={cn(
              "h-4.5 w-4.5 transition-transform group-hover:scale-110",
              !isCollapsed && "mr-3",
            )}
          />
          {!isCollapsed && "Гарах"}
        </button>
      </div>
    </aside>
    </>
  );
}
