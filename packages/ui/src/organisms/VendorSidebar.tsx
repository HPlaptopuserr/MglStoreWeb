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
} from "lucide-react";

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const navigation = [
  { name: "Хяналтын самбар", href: "/dashboard", icon: LayoutDashboard },
  { name: "POS касс", href: "/pos", icon: ScanLine },
  { name: "Өөрийн бүтээгдэхүүн", href: "/products", icon: Package },
  { name: "Нэгдсэн бараа", href: "/supply-products", icon: Boxes },
  { name: "Үйлчилгээний постууд", href: "/service-posts", icon: Megaphone },
  { name: "Түгээгчийн мэдээлэл", href: "/drivers", icon: Users },
  { name: "Хүсэлтүүд", href: "/requests", icon: ClipboardList },
  { name: "Төлбөр", href: "/payments", icon: CreditCard },
];

export interface VendorSidebarProps {
  onSignOut?: () => void;
  showPos?: boolean;
}

export function VendorSidebar({ onSignOut, showPos = false }: VendorSidebarProps) {
  const filteredNavigation = navigation.filter(
    (item) => item.href !== "/pos" || showPos,
  );
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`${
        isCollapsed ? "w-[88px]" : "w-64"
      } sticky top-0 flex h-screen shrink-0 flex-col border-r border-white/10 bg-black text-white shadow-2xl transition-all duration-300`}
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

      <div className={`flex h-24 items-center ${isCollapsed ? "justify-center px-2" : "px-8"}`}>
        <div className={`flex items-center ${isCollapsed ? "" : "space-x-3"}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFAD02] shadow-[0_0_15px_rgba(255,173,2,0.4)]">
            <Truck className="h-6 w-6 text-black" />
          </div>

          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-black tracking-tighter text-white">
                MGL<span className="text-[#FFAD02]">Store</span>
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-white/40">
                Marrow
              </p>
            </div>
          )}
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto py-6 ${isCollapsed ? "px-2" : "px-4"}`}>
        <nav className="space-y-2">
          {!isCollapsed && (
            <p className="mb-4 px-4 text-xs font-bold uppercase tracking-wider text-white/30">
              Цэс
            </p>
          )}

          {filteredNavigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const isPosActive = isActive && item.href === "/pos";

            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  "group flex items-center rounded-2xl text-sm font-bold transition-all duration-300",
                  isCollapsed ? "justify-center px-0 py-3.5" : "px-4 py-3.5",
                  isPosActive
                    ? "bg-emerald-500 text-white shadow-[0_0_22px_rgba(16,185,129,0.35)] ring-2 ring-emerald-300/40"
                    : isActive
                    ? "bg-[#FFAD02] text-black shadow-[0_0_20px_rgba(255,173,2,0.25)]"
                    : "text-white/60 hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0",
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

      <div className={`border-t border-white/10 ${isCollapsed ? "p-3" : "p-6"}`}>
        <button
          onClick={onSignOut}
          title={isCollapsed ? "Гарах" : undefined}
          className="group flex w-full items-center justify-center rounded-2xl px-4 py-4 text-sm font-bold text-white/60 transition-all duration-300 hover:bg-red-500/20 hover:text-red-400"
        >
          <LogOut
            className={cn(
              "h-5 w-5 transition-transform group-hover:scale-110",
              !isCollapsed && "mr-3",
            )}
          />
          {!isCollapsed && "Гарах"}
        </button>
      </div>
    </aside>
  );
}
