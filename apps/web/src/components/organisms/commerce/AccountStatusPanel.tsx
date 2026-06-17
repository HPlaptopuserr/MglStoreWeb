"use client";

import Link from "next/link";
import type React from "react";
import {
  Clock3,
  FileText,
  Heart,
  Home,
  LogOut,
  ShoppingBag,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { useAuth } from "@/lib/auth-context";

export function AccountStatusPanel({ searchQuery }: { searchQuery?: string }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-slate-200" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="h-3 w-40 rounded bg-slate-200" />
          </div>
        </div>
        <div className="mt-4 h-10 rounded-xl bg-slate-200" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <UserRound className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-black text-slate-950">Тавтай морил</p>
            <p className="mt-0.5 text-xs font-semibold leading-4 text-slate-400">
              Нэвтэрч худалдан авалтаа удирдаарай
            </p>
          </div>
        </div>

        <Link
          href="/login"
          className="mt-4 flex h-10 items-center justify-center rounded-xl bg-orange-500 text-sm font-black text-white transition hover:bg-slate-950"
        >
          Нэвтрэх
        </Link>

        <QuickLinks
          links={[
            { label: "Сагс", icon: ShoppingBag, href: "/checkout" },
            { label: "Захиалга", icon: Clock3, href: ACCOUNT_ROUTES.orders },
            { label: "Профайл", icon: Heart, href: ACCOUNT_ROUTES.profileInfo },
          ]}
        />

        {searchQuery ? <SearchBadge searchQuery={searchQuery} /> : null}
      </div>
    );
  }

  const hasAddress = Boolean(user.defaultAddress?.fullAddress);
  const hasTerms = Boolean(user.termsAcceptedAt);

  return (
    <div className="rounded-2xl border border-orange-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="p-3">
        <div className="grid grid-cols-2 gap-2">
          <StatusPill
            active={hasTerms}
            icon={ShieldCheck}
            title="Нөхцөл"
            label={hasTerms ? "Зөвшөөрсөн" : "Бөглөх"}
            href={ACCOUNT_ROUTES.profileAddress}
          />
          <StatusPill
            active={hasAddress}
            icon={Home}
            title="Хаяг"
            label={hasAddress ? "Бүртгэлтэй" : "Нэмэх"}
            href={ACCOUNT_ROUTES.profileAddress}
          />
        </div>

        <QuickLinks
          links={[
            { label: "Файлууд", icon: FileText, href: ACCOUNT_ROUTES.profileLibrary },
            { label: "Захиалга", icon: Clock3, href: ACCOUNT_ROUTES.orders },
            { label: "Профайл", icon: Heart, href: ACCOUNT_ROUTES.profileInfo },
          ]}
        />
        <button
          type="button"
          onClick={logout}
          className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-slate-50 text-xs font-black text-slate-500 ring-1 ring-slate-100 transition hover:bg-orange-50 hover:text-orange-600"
        >
          <LogOut className="h-4 w-4" />
          Гарах
        </button>
        {searchQuery ? <SearchBadge searchQuery={searchQuery} /> : null}
      </div>
    </div>
  );
}

type QuickLink = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

function QuickLinks({ links }: { links: QuickLink[] }) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {links.map(({ label, icon: Icon, href }) => (
        <Link
          key={label}
          href={href}
          className="rounded-xl bg-white px-2 py-2.5 text-center text-[11px] font-black text-slate-600 ring-1 ring-slate-100 transition hover:text-orange-600 hover:shadow-sm"
        >
          <Icon className="mx-auto mb-1 h-4 w-4" />
          {label}
        </Link>
      ))}
    </div>
  );
}

function StatusPill({
  active,
  icon: Icon,
  title,
  label,
  href,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-black ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          : "bg-orange-50 text-orange-700 ring-1 ring-orange-100"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate text-slate-700">{title}</span>
        <span className="block truncate text-[10px] opacity-75">{label}</span>
      </span>
    </Link>
  );
}

function SearchBadge({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="mt-3 rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs font-black text-orange-700">
      <span className="text-slate-500">Хайлт:</span> "{searchQuery}"
    </div>
  );
}
