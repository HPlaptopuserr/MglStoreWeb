"use client";

import { Building2, Loader2, Menu, X } from "lucide-react";
import { OrgOrganization, OrgUser } from "@/lib/api";
import { initials } from "@/lib/org-format";

type OrgTopbarProps = {
  mobileOpen: boolean;
  user: OrgUser;
  organizations: OrgOrganization[];
  switching: boolean;
  switchError: string;
  onOpenMenu: () => void;
  onSwitchOrganization: (organizationId: string) => void;
};

export default function OrgTopbar({
  mobileOpen,
  user,
  organizations,
  switching,
  switchError,
  onOpenMenu,
  onSwitchOrganization,
}: OrgTopbarProps) {
  const hasOtherOrganization = organizations.some(
    (organization) => organization.id !== user.organizationId,
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <button
          type="button"
          onClick={onOpenMenu}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 lg:hidden"
          aria-label="Цэс нээх"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
            Байгууллагын удирдлага
          </p>
          <h1 className="truncate text-lg font-black text-slate-950">
            {user.organizationName || "Байгууллага"}
          </h1>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
          {hasOtherOrganization ? (
            <label className="relative min-w-0">
              <span className="sr-only">Байгууллага солих</span>
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={user.organizationId || ""}
                disabled={switching}
                onChange={(event) => onSwitchOrganization(event.target.value)}
                className="h-10 w-40 truncate rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 focus:border-indigo-400 disabled:cursor-wait disabled:opacity-60 sm:w-64 sm:text-sm"
              >
                {organizations.map((organization) => {
                  const inactive = Boolean(
                    organization.status && organization.status !== "ACTIVE",
                  );
                  return (
                    <option
                      key={organization.id}
                      value={organization.id}
                      disabled={inactive}
                    >
                      {organization.name}
                      {inactive ? " · Идэвхгүй" : ""}
                    </option>
                  );
                })}
              </select>
              {switching ? (
                <Loader2 className="pointer-events-none absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-indigo-600" />
              ) : null}
            </label>
          ) : null}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
            {initials(user.fullName || user.organizationName)}
          </div>
        </div>
      </div>
      {switchError ? (
        <p
          role="alert"
          className="mx-auto mt-2 max-w-7xl rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
        >
          {switchError}
        </p>
      ) : null}
    </header>
  );
}
