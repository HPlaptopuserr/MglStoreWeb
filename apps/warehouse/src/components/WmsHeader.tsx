"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, Menu } from "lucide-react";

interface WmsHeaderProps {
  userName: string;
  userInitials: string;
  onMenuClick: () => void;
  isMobile?: boolean;
}

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":      "Хянах самбар",
  "/inventory":      "Нөөцийн байдал",
  "/receive":        "Бараа хүлээн авах",
  "/dispatch":       "Бараа гаргах",
  "/dispatch-orders":"Илгээмжийн захиалга",
  "/transfers":      "Шилжүүлэг",
  "/movements":      "Хөдөлгөөний түүх",
  "/reports":        "Тайлан",
  "/settings":       "Тохиргоо",
};

export default function WmsHeader({ userName, userInitials, onMenuClick, isMobile }: WmsHeaderProps) {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] || "MGL WMS";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        {isMobile && <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Menu className="h-5 w-5" />
        </button>}

        <h1 className="text-base font-bold text-slate-900 md:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Search — desktop only */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="SKU, баркод хайх..."
            className="h-9 w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            3
          </span>
        </button>

        {/* User */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 md:px-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
            {userInitials}
          </div>
          <span className="hidden text-sm font-medium text-slate-700 lg:block">{userName}</span>
        </div>
      </div>
    </header>
  );
}
