"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";

interface VendorHeaderProps {
  onMenuToggle?: () => void;
  notificationComponent?: React.ReactNode;
}

export function VendorHeader({ onMenuToggle, notificationComponent }: VendorHeaderProps) {
  const pathname = usePathname();
  const isProfilePage = pathname === "/profile";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
      <div className="flex flex-1 items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 md:hidden"
          aria-label="Цэс нээх"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1">
          {isProfilePage && (
            <h2 className="text-lg font-bold text-slate-900">Миний профайл</h2>
          )}
        </div>
      </div>

      <div className="ml-3 flex items-center gap-2 sm:gap-3">
        {notificationComponent || (
          <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700">
            <Bell className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
}
