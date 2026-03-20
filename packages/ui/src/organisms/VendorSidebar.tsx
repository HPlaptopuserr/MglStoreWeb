"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Warehouse,
  Package,
  Truck,
  LogOut,
  Users,
  RotateCcw,
  ClipboardList,
  Megaphone,
} from "lucide-react";

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const navigation = [
  { name: "Хяналтын самбар", href: "/dashboard", icon: LayoutDashboard },
  { name: "Агуулахууд", href: "/warehouses", icon: Warehouse },
  { name: "Бүтээгдэхүүнүүд", href: "/products", icon: Package },
  { name: "Үйлчилгээний постууд", href: "/service-posts", icon: Megaphone },
  { name: "Жолооч нар", href: "/drivers", icon: Users },
  { name: "Бараа татах хүсэлт", href: "/shipments", icon: Truck },
  { name: "Буцаалт", href: "/returns", icon: RotateCcw },
  { name: "Үйлчилгээ", href: "/services", icon: ClipboardList },
];

export interface VendorSidebarProps {
  onSignOut?: () => void;
}

export function VendorSidebar({ onSignOut }: VendorSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-black text-white shadow-2xl">
      <div className="flex h-24 items-center px-8">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFAD02] shadow-[0_0_15px_rgba(255,173,2,0.4)]">
            <Truck className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white">
              MGL<span className="text-[#FFAD02]">Store</span>
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-widest text-white/40">
              Marrow
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <nav className="space-y-2">
          <p className="mb-4 px-4 text-xs font-bold uppercase tracking-wider text-white/30">
            Цэс
          </p>

          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center rounded-2xl px-4 py-3.5 text-sm font-bold transition-all duration-300",
                  isActive
                    ? "bg-[#FFAD02] text-black shadow-[0_0_20px_rgba(255,173,2,0.25)]"
                    : "text-white/60 hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 shrink-0",
                    isActive
                      ? "text-black"
                      : "text-white/60 group-hover:text-white",
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-white/10 p-6">
        <button
          onClick={onSignOut}
          className="group flex w-full items-center justify-center rounded-2xl px-4 py-4 text-sm font-bold text-white/60 transition-all duration-300 hover:bg-red-500/20 hover:text-red-400"
        >
          <LogOut className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
          Гарах
        </button>
      </div>
    </aside>
  );
}
