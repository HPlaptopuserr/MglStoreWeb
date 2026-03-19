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
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
      <div className="max-w-xl flex-1">
        {isProfilePage ? (
          <h2 className="text-lg font-bold text-slate-900">Миний профайл</h2>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search products, shipments..."
              className="h-11 rounded-2xl border-slate-200 pl-10 text-black"
            />
          </div>
        )}
      </div>

      <div className="ml-6 flex items-center gap-4">
        <button className="relative rounded-full bg-slate-100 p-3 transition hover:bg-slate-200">
          <Bell className="h-5 w-5 text-slate-600" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <Link href="/profile" className="flex items-center gap-3 rounded-2xl bg-slate-100 px-3 py-2 transition-colors hover:bg-slate-200 cursor-pointer">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900">{userName}</p>
            <p className="text-xs text-slate-500">{userRole}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
            {initials}
          </div>
        </Link>
      </div>
    </header>
  );
}
