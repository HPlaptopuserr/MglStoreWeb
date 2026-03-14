"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Layers,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Tag,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  isActive?: boolean;
}

export interface SidebarProps {
  userName?: string;
  userRole?: string;
  userInitials?: string;
  onSignOut?: () => void;
  navItems?: NavItem[];
}

export function AdminSidebar({
  userName = "Admin User",
  userRole = "ADMIN",
  userInitials = "AD",
  onSignOut,
  navItems,
}: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

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
      label: "Бизнесийн ангиллал",
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

  return (
    <>
      <div
        className={`${
          isCollapsed ? "w-[88px]" : "w-[260px]"
        } shrink-0 transition-all duration-300 hidden md:block`}
        style={{ width: isCollapsed ? 88 : 260 }}
      />

      <aside
        className={`
          ${isCollapsed ? "w-[88px]" : "w-[260px]"}
          border-r border-slate-200 bg-white
          flex flex-col
          px-4 pt-8 pb-6
          transition-all duration-300
          h-screen
          fixed top-0 left-0 z-40 overflow-y-auto pb-10
          hidden md:flex
          md:block
        `}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 z-10 hidden rounded-full border border-slate-200 bg-white p-1 text-slate-500 shadow-sm hover:text-[#5B4CFF] md:flex"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        <div
          className={`mb-8 flex items-center ${
            isCollapsed ? "justify-center" : "gap-3 px-2"
          }`}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5B4CFF] text-white shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>

          {!isCollapsed && (
            <span className="truncate text-xl font-bold text-slate-800">
              Marrow
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.isActive !== undefined
                ? item.isActive
                : item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`
                  flex items-center rounded-2xl transition-all duration-200
                  ${isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-3"}
                  ${
                    isActive
                      ? "bg-[#5B4CFF]/10 text-[#5B4CFF] font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                  }
                `}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && (
                  <span className="truncate whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <div
            className={`rounded-2xl bg-slate-50 ${
              isCollapsed ? "p-2" : "p-4"
            } transition-all duration-300`}
          >
            <div
              className={`flex items-center ${
                isCollapsed ? "justify-center" : "gap-3"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5B4CFF]/10 text-sm font-bold text-[#5B4CFF] shrink-0">
                {userInitials}
              </div>

              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800">
                    {userName}
                  </div>
                  <div className="text-xs font-medium uppercase text-slate-400">
                    {userRole}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onSignOut}
              title={isCollapsed ? "Гарах" : undefined}
              className={`
                mt-4 flex w-full items-center rounded-xl text-sm font-semibold text-red-500
                transition-colors hover:bg-red-50 hover:text-red-600
                ${isCollapsed ? "justify-center py-2" : "gap-2 px-2 py-2"}
              `}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
