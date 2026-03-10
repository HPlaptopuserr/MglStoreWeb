"use client";

import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/Input";

export default function VendorHeader() {
  const displayName = "Admin User";
  const role = "Logistics Manager";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-slate-200 bg-slate-50/80 px-8 py-4 backdrop-blur-sm">
      <div className="max-w-xl flex-1">
        <div className="group relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-[#FFAD02]" />
          </div>

          <Input
            className="h-12 rounded-2xl border-none bg-white pl-10 font-medium text-slate-600 shadow-sm transition-all placeholder:text-slate-400 hover:shadow-md focus:ring-2 focus:ring-[#FFAD02]/20"
            placeholder="Search shipments, products, drivers..."
          />
        </div>
      </div>

      <div className="flex items-center space-x-6 pl-8">
        <button
          type="button"
          className="group relative rounded-full bg-white p-3 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
        >
          <Bell className="h-5 w-5 text-slate-400 transition-colors group-hover:text-[#FFAD02]" />
          <span className="absolute right-3 top-2.5 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
        </button>

        <Link
          href="/profile"
          className="group flex items-center space-x-3 rounded-2xl border-l border-slate-200 p-2 pl-6 transition-colors hover:bg-slate-50"
        >
          <div className="hidden text-right md:block">
            <p className="text-sm font-bold text-slate-900 transition-colors group-hover:text-[#FFAD02]">
              {displayName}
            </p>
            <p className="text-xs font-medium text-slate-400">{role}</p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white shadow-lg shadow-black/20 ring-2 ring-white transition-all group-hover:scale-105 group-hover:ring-[#FFAD02]">
            <span className="text-sm font-bold">{initial}</span>
          </div>
        </Link>
      </div>
    </header>
  );
}
