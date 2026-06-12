"use client";

import {
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth-context";

const ORG_URL =
  process.env.NEXT_PUBLIC_ORG_URL || "http://localhost:3004";
const VENDOR_URL =
  process.env.NEXT_PUBLIC_VENDOR_URL || "http://localhost:3002";

const roleLabel: Record<string, string> = {
  OWNER: "Эзэмшигч",
  ADMIN: "Админ",
  STAFF: "Ажилтан",
  VIEWER: "Ажиглагч",
};

function getOrgInitials(name?: string | null) {
  return (name || "ORG")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function OrganizationAffiliationCard({ user }: { user: AuthUser }) {
  const hasOrg = Boolean(user.organizationId && user.orgRole);
  const organizationName = user.organizationName || "Байгууллага";
  const role = user.orgRole || "";

  if (!hasOrg) return null;

  return (
    <section className="group relative overflow-hidden rounded-[26px] border border-emerald-100 bg-white p-4 shadow-[0_16px_50px_rgba(15,23,42,0.08)] transition duration-300 animate-[orgCardIn_420ms_ease-out] hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-5">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-emerald-500" />
      <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-emerald-200/45 blur-3xl transition duration-500 group-hover:scale-125" />

      <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-base font-black text-white shadow-lg shadow-emerald-500/25 ring-4 ring-emerald-50 transition duration-300 group-hover:scale-105 sm:h-16 sm:w-16">
            {getOrgInitials(organizationName)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-emerald-100">
                <CheckCircle2 size={12} />
                Идэвхтэй
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
                <ShieldCheck size={12} className="text-emerald-600" />
                {roleLabel[role] || role}
              </span>
            </div>
            <h2 className="mt-2 truncate text-xl font-black text-slate-950 sm:text-2xl">
              {organizationName}
            </h2>
            <p className="mt-1 line-clamp-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              Энэ account-аар vendor/org дээр нэвтрэхэд байгууллагын удирдлагын орчин нээгдэнэ.
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:w-72">
          <PortalButton href={`${ORG_URL.replace(/\/$/, "")}/login`} primary>
            Org
          </PortalButton>
          <PortalButton href={`${VENDOR_URL.replace(/\/$/, "")}/login`}>
            Vendor
          </PortalButton>
        </div>
      </div>
    </section>
  );
}

function PortalButton({
  children,
  href,
  primary,
}: {
  children: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-black shadow-sm transition duration-200 hover:-translate-y-0.5 ${
        primary
          ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-500/20"
          : "border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
      }`}
    >
      {children}
      <ArrowUpRight size={15} />
    </a>
  );
}
