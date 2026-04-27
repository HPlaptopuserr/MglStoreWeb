"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { Input } from "../atoms/Input";

interface VendorHeaderProps {
  userName?: string;
  userEmail?: string;
  userRole?: string;
  userInitials?: string;
}

export function VendorHeader({
  userName = "Vendor User",
  userRole = "Vendor",
  userInitials,
}: VendorHeaderProps) {
  const initials = userInitials || userName.charAt(0).toUpperCase();
  const pathname = usePathname();
  const isProfilePage = pathname === "/profile";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
      <div className="max-w-xl flex-1">
        {isProfilePage ? (
          <h2 className="text-lg font-bold text-slate-900">Миний профайл</h2>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="SKU, бараа хайх..."
              className="h-9 rounded-lg border-slate-200 bg-slate-50 pl-9 text-sm text-slate-700"
            />
          </div>
        )}
      </div>

      <div className="ml-6 flex items-center gap-3">
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">3</span>
        </button>

        <Link href="/profile" className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 transition-colors hover:bg-slate-200 cursor-pointer">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">{userName}</p>
            <p className="text-[11px] text-slate-500">{userRole}</p>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-[11px] font-bold text-white">
            {initials}
          </div>
        </Link>
      </div>
    </header>
  );
}
