"use client";

import Link from "next/link";
import { Building2, LogOut } from "lucide-react";
import { OrgUser } from "@/lib/api";
import { OrgNavItem } from "@/components/org/orgNavigation";

type OrgSidebarProps = {
  navItems: OrgNavItem[];
  pathname: string;
  user: OrgUser;
  onLogout: () => void;
  onNavigate?: () => void;
};

export default function OrgSidebar({
  navItems,
  pathname,
  user,
  onLogout,
  onNavigate,
}: OrgSidebarProps) {
  const visibleNav = navItems.filter((item) => item.enabled !== false);

  return (
    <aside className="flex h-full flex-col bg-slate-950 text-white">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400 text-slate-950">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black">MGL Org</p>
          <p className="truncate text-[11px] font-semibold text-white/45">
            {user.organizationName || "Байгууллага"}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                active
                  ? "bg-indigo-400 text-slate-950"
                  : "text-white/65 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-3 rounded-xl bg-white/[0.04] px-3 py-2">
          <p className="text-sm font-black">{user.fullName || "Org user"}</p>
          <p className="truncate text-xs font-semibold text-white/45">
            {user.email}
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-black text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Гарах
        </button>
      </div>
    </aside>
  );
}
