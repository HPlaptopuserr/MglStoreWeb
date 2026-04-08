"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  PackageCheck,
  PackageMinus,
  ArrowLeftRight,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Warehouse,
  Settings,
  BarChart3,
  ClipboardList,
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Хянах самбар",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Нөөцийн байдал",
    href: "/inventory",
    icon: Package,
  },
  {
    label: "Бараа хүлээн авах",
    href: "/receive",
    icon: PackageCheck,
  },
  {
    label: "Илгээмжийн захиалга",
    href: "/dispatch-orders",
    icon: ClipboardList,
  },
  {
    label: "Бараа гаргах",
    href: "/dispatch",
    icon: PackageMinus,
  },
  {
    label: "Шилжүүлэг",
    href: "/transfers",
    icon: ArrowLeftRight,
  },
  {
    label: "Хөдөлгөөний түүх",
    href: "/movements",
    icon: ScrollText,
  },
  {
    label: "Тайлан",
    href: "/reports",
    icon: BarChart3,
  },
];

interface WmsSidebarProps {
  warehouseName: string;
  userName: string;
  userInitials: string;
  onSignOut: () => void;
}

export default function WmsSidebar({
  warehouseName,
  userName,
  userInitials,
  onSignOut,
}: WmsSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-800 bg-[#0f172a] text-white transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[260px]"
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600">
          <Warehouse className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-white">
              MGL WMS
            </p>
            <p className="truncate text-[11px] text-slate-400">
              {warehouseName}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600/15 text-blue-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <item.icon
                className={`h-5 w-5 shrink-0 ${
                  isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                }`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {isActive && (
                <div className="absolute left-0 h-8 w-[3px] rounded-r-full bg-blue-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-800 p-3">
        <Link
          href="/settings"
          className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Тохиргоо</span>}
        </Link>

        {/* User */}
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            {userInitials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200">
                {userName}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onSignOut}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Гарах</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mt-2 flex w-full items-center justify-center rounded-lg py-1.5 text-slate-600 transition-colors hover:bg-slate-800 hover:text-slate-400"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
