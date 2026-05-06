"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, PackageCheck, PackageMinus,
  ArrowLeftRight, ScrollText, ChevronLeft, ChevronRight,
  LogOut, Warehouse, Settings, BarChart3, ClipboardList, X,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Хянах самбар",        href: "/dashboard",       icon: LayoutDashboard },
  { label: "Нөөцийн байдал",      href: "/inventory",       icon: Package },
  { label: "Бараа хүлээн авах",   href: "/receive",         icon: PackageCheck },
  { label: "Илгээмжийн захиалга", href: "/dispatch-orders", icon: ClipboardList },
  { label: "Бараа гаргах",        href: "/dispatch",        icon: PackageMinus },
  { label: "Шилжүүлэг",          href: "/transfers",       icon: ArrowLeftRight },
  { label: "Хөдөлгөөний түүх",   href: "/movements",       icon: ScrollText },
  { label: "Тайлан",              href: "/reports",         icon: BarChart3 },
];

interface Props {
  warehouseName: string;
  userName: string;
  userInitials: string;
  onSignOut: () => void;
  isMobile: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
}

function SidebarInner({
  warehouseName, userName, userInitials, onSignOut,
  collapsed, onCollapsedChange, isMobile, onMobileClose,
}: Props) {
  const pathname = usePathname();
  const showLabel = isMobile || !collapsed;

  return (
    <div
      className="flex h-full flex-col border-r border-slate-800 bg-[#0f172a] text-white"
      style={{ width: isMobile ? 260 : collapsed ? 72 : 260 }}
    >
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600">
          <Warehouse className="h-5 w-5 text-white" />
        </div>
        {showLabel && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">MGL WMS</p>
            <p className="truncate text-[11px] text-slate-400">{warehouseName}</p>
          </div>
        )}
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={isMobile ? onMobileClose : undefined}
              title={!showLabel ? item.label : undefined}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <item.icon className={`h-5 w-5 shrink-0 ${active ? "text-blue-400" : "text-slate-500"}`} />
              {showLabel && <span className="truncate">{item.label}</span>}
              {active && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-blue-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="shrink-0 border-t border-slate-800 p-2 pb-3">
        <Link
          href="/settings"
          onClick={isMobile ? onMobileClose : undefined}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <Settings className="h-5 w-5 shrink-0" />
          {showLabel && <span>Тохиргоо</span>}
        </Link>

        <div className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            {userInitials}
          </div>
          {showLabel && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200">{userName}</p>
            </div>
          )}
        </div>

        <button
          onClick={onSignOut}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {showLabel && <span>Гарах</span>}
        </button>

        {!isMobile && (
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="mt-1 flex w-full items-center justify-center rounded-xl py-2 text-slate-600 hover:bg-slate-800 hover:text-slate-400"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function WmsSidebar(props: Props) {
  const { isMobile, mobileOpen, onMobileClose, collapsed } = props;

  return (
    <>
      {/* Desktop — fixed sidebar */}
      {!isMobile && (
        <div
          className="fixed inset-y-0 left-0 z-40"
          style={{ width: collapsed ? 72 : 260 }}
        >
          <SidebarInner {...props} />
        </div>
      )}

      {/* Mobile — full-screen drawer overlay */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            style={{ backdropFilter: "blur(2px)" }}
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <div className="relative z-10 h-full">
            <SidebarInner {...props} />
          </div>
        </div>
      )}
    </>
  );
}
