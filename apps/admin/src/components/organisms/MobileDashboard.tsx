"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Layers,
  Settings,
  LogOut,
  ShieldCheck,
  Tag,
  Menu,
  X,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  isActive?: boolean;
}

export interface MobileDashboardProps {
  userName?: string;
  userRole?: string;
  userInitials?: string;
  onSignOut?: () => void;
  navItems?: NavItem[];
}

export function MobileDashboard({
  userName = "Admin User",
  userRole = "ADMIN",
  userInitials = "AD",
  onSignOut,
  navItems,
}: MobileDashboardProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const defaultNavItems: NavItem[] = [
    {
      id: "dashboard",
      label: "Хяналтын самбар",
      icon: LayoutGrid,
      href: "/dashboard",
    },
    {
      id: "requests",
      label: "Хүсэлтүүд",
      icon: Users,
      href: "/requests",
    },
    {
      id: "partners",
      label: "Түншүүд",
      icon: Users,
      href: "/partners",
    },
    {
      id: "categories",
      label: "Бизнесийн ангилал",
      icon: Tag,
      href: "/categories",
    },
    {
      id: "sections",
      label: "Сайтын хэсгүүд",
      icon: Layers,
      href: "/sections",
    },
    {
      id: "settings",
      label: "Тохиргоо",
      icon: Settings,
      href: "/settings",
    },
  ];

  const items = navItems || defaultNavItems;

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const isItemActive = (item: NavItem) => {
    if (item.isActive !== undefined) return item.isActive;

    return item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname?.startsWith(item.href);
  };

  return (
    <>
      {/* Fixed mobile header bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md md:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 active:scale-95"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#5B4CFF] text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="text-base font-bold text-slate-800">Marrow</span>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5B4CFF]/10 text-xs font-bold text-[#5B4CFF]">
          {userInitials}
        </div>
      </header>

      {/* Spacer so content doesn't hide behind fixed header */}
      <div className="h-14 md:hidden" />

      {isOpen && (
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/40 md:hidden"
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-60 flex h-screen w-70 flex-col border-r border-slate-200 bg-white px-4 pt-6 pb-6 shadow-xl transition-transform duration-300 md:hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5B4CFF] text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-slate-800">Marrow</span>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item);

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200
                  ${
                    isActive
                      ? "bg-[#5B4CFF]/10 font-semibold text-[#5B4CFF]"
                      : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }
                `}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5B4CFF]/10 text-sm font-bold text-[#5B4CFF]">
                {userInitials}
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-800">
                  {userName}
                </div>
                <div className="text-xs font-medium uppercase text-slate-400">
                  {userRole}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onSignOut?.();
              }}
              className="mt-4 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
