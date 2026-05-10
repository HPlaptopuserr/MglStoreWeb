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
  Package,
  CreditCard,
  Building2,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  isActive?: boolean;
}

type NavGroup = {
  id: string;
  title: string;
  items: NavItem[];
};

export interface SidebarProps {
  userName?: string;
  userRole?: string;
  userInitials?: string;
  onSignOut?: () => void;
  navItems?: NavItem[];
  /** Optional slot rendered above the user card (e.g. account switcher) */
  bottomSlot?: React.ReactNode;
}

export function AdminSidebar({
  userName = "Admin User",
  userRole = "ADMIN",
  userInitials = "AD",
  onSignOut,
  navItems,
  bottomSlot,
}: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const defaultNavGroups: NavGroup[] = [
    {
      id: "core",
      title: "Үндсэн",
      items: [
        {
          id: "dashboard",
          label: "Хяналтын самбар",
          icon: LayoutGrid,
          href: "/dashboard",
        },
      ],
    },
    {
      id: "requests",
      title: "Хүсэлтүүд",
      items: [
        {
          id: "requests",
          label: "Хүсэлтүүд",
          icon: Users,
          href: "/requests",
        },
        {
          id: "association",
          label: "Гишүүнчлэл",
          icon: Building2,
          href: "/association",
        },
      ],
    },
    {
      id: "catalog",
      title: "Каталог ба түнш",
      items: [
        {
          id: "partners",
          label: "Түншүүд",
          icon: Users,
          href: "/partners",
        },
        {
          id: "card-terminal-requests",
          label: "Card Terminal хүсэлт",
          icon: CreditCard,
          href: "/partners/card-terminal-requests",
        },
        {
          id: "warehouses",
          label: "Агуулах",
          icon: Package,
          href: "/warehouses",
        },
      ],
    },
    {
      id: "content",
      title: "Сайт",
      items: [
        {
          id: "sections",
          label: "Нэмэлт хэсгүүд",
          icon: Layers,
          href: "/sections",
        },
      ],
    },
    {
      id: "system",
      title: "Систем",
      items: [
        {
          id: "settings",
          label: "Тохиргоо",
          icon: Settings,
          href: "/settings",
        },
        {
          id: "categories",
          label: "Бизнесийн ангилал",
          icon: Tag,
          href: "/categories",
        },
      ],
    },
  ];

  const navGroups: NavGroup[] = navItems
    ? [{ id: "custom", title: "Цэс", items: navItems }]
    : defaultNavGroups;

  return (
    <>
      <div
        className={`${
          isCollapsed ? "w-[84px]" : "w-[252px]"
        } shrink-0 transition-all duration-300 hidden md:block`}
        style={{ width: isCollapsed ? 84 : 252 }}
      />

      <aside
        className={`
          ${isCollapsed ? "w-[84px]" : "w-[252px]"}
          border-r border-slate-200 bg-white
          flex flex-col
          px-3 pt-5 pb-5
          transition-all duration-300
          h-screen
          fixed top-0 left-0 z-40 overflow-x-visible
          hidden md:flex
          md:block
        `}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-1/2 z-50 flex -translate-y-1/2 rounded-full border border-slate-200 bg-white p-1 text-slate-500 shadow-sm transition-all hover:scale-105 hover:text-[#5B4CFF]"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-6 w-6" />
          ) : (
            <ChevronLeft className="h-6 w-6" />
          )}
        </button>

        <div
          className={`mb-6 flex items-center ${
            isCollapsed ? "justify-center" : "gap-3 px-2"
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B4CFF] text-white shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>

          {!isCollapsed && (
            <span className="truncate text-lg font-bold text-slate-800">
              Marrow
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden pr-1">
          {navGroups.map((group) => (
            <div key={group.id} className="space-y-2">
              {!isCollapsed && (
                <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {group.title}
                </p>
              )}

              {group.items.map((item) => {
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
                      flex items-center rounded-lg transition-all duration-200
                      ${isCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"}
                      ${
                        isActive
                          ? "bg-[#5B4CFF]/10 text-[#5B4CFF] font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                      }
                    `}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    {!isCollapsed && (
                      <span className="truncate whitespace-nowrap text-sm">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-slate-200 pt-4 pb-3 mt-auto">
          {bottomSlot && !isCollapsed && (
            <div className="mb-3">{bottomSlot}</div>
          )}
          <div
            className={`rounded-xl bg-slate-50 ${
              isCollapsed ? "p-2" : "p-4"
            } transition-all duration-300`}
          >
            <div
              className={`flex items-center ${
                isCollapsed ? "justify-center" : "gap-3"
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5B4CFF]/10 text-sm font-bold text-[#5B4CFF] shrink-0">
                {userInitials}
              </div>

              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {userName}
                  </div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {userRole}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onSignOut}
              title={isCollapsed ? "Гарах" : undefined}
              className={`
                mt-3 flex w-full items-center rounded-lg text-sm font-semibold text-red-500
                transition-colors hover:bg-red-50 hover:text-red-600
                ${isCollapsed ? "justify-center py-2" : "gap-2 px-2 py-2"}
              `}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>Гарах</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
