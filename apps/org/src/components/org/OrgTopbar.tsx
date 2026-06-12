"use client";

import { Menu, X } from "lucide-react";
import { OrgUser } from "@/lib/api";
import { initials } from "@/lib/org-format";

type OrgTopbarProps = {
  mobileOpen: boolean;
  user: OrgUser;
  onOpenMenu: () => void;
};

export default function OrgTopbar({
  mobileOpen,
  user,
  onOpenMenu,
}: OrgTopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <button
          type="button"
          onClick={onOpenMenu}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 lg:hidden"
          aria-label="Цэс нээх"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
            Байгууллагын удирдлага
          </p>
          <h1 className="truncate text-lg font-black text-slate-950">
            {user.organizationName || "Байгууллага"}
          </h1>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
          {initials(user.fullName || user.organizationName)}
        </div>
      </div>
    </header>
  );
}
