"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Coins,
  FileArchive,
  FileText,
  Settings,
  ShieldCheck,
  Truck,
  UserRound,
} from "lucide-react";
import { ACCOUNT_ROUTES, PROFILE_SETTING_LINKS } from "@/lib/account-routes";
import type { AccountContract, AccountPurchase, ProfileOrder } from "./types";

type ProfileDashboardShellProps = {
  children: ReactNode;
};

const settingsNav = [
  {
    ...PROFILE_SETTING_LINKS[0],
    label: "Профайл засах",
    icon: UserRound,
  },
  {
    ...PROFILE_SETTING_LINKS[1],
    label: "Аюулгүй байдал",
    icon: ShieldCheck,
  },
  {
    ...PROFILE_SETTING_LINKS[2],
    label: "Мэдэгдэл, хаяг",
    icon: Bell,
  },
];

export function ProfileDashboardShell({
  children,
}: ProfileDashboardShellProps) {
  return (
    <main className="min-h-screen bg-[#eef2f7] px-3 pb-28 pt-4 text-slate-950 md:px-6 md:pb-8 md:pt-8">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">{children}</div>
    </main>
  );
}

export function ProfileContentGrid({
  children,
  contracts,
  orders,
  points,
  purchases,
}: {
  children: ReactNode;
  contracts: AccountContract[];
  orders: ProfileOrder[];
  points: number;
  purchases: AccountPurchase[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-6">
      <div className="min-w-0 space-y-4">
        <MobileSettingsPanel />
        {children}
      </div>
      <div className="hidden xl:block">
        <ProfileRightRail
          contracts={contracts}
          orders={orders}
          points={points}
          purchases={purchases}
        />
      </div>
    </div>
  );
}

export function ProfileStatsGrid({
  libraryCount,
  onLibraryClick,
  onOrdersClick,
  onPointsClick,
  openOrdersCount,
  ordersCount,
  points,
}: {
  libraryCount: number;
  onLibraryClick: () => void;
  onOrdersClick: () => void;
  onPointsClick: () => void;
  openOrdersCount: number;
  ordersCount: number;
  points: number;
}) {
  const actions = [
    {
      label: "Миний сан",
      value: `${libraryCount} файл`,
      icon: FileText,
      className: "bg-orange-50 text-orange-600 ring-orange-100",
      onClick: onLibraryClick,
    },
    {
      label: "M point",
      value: `${points.toLocaleString("mn-MN")} M`,
      icon: Coins,
      className: "bg-amber-50 text-amber-600 ring-amber-100",
      onClick: onPointsClick,
    },
    {
      label: "Захиалга",
      value: `${ordersCount} захиалга`,
      meta: openOrdersCount > 0 ? `${openOrdersCount} нээлттэй` : "Идэвхтэй алга",
      icon: Truck,
      className: "bg-indigo-50 text-indigo-600 ring-indigo-100",
      onClick: onOrdersClick,
    },
  ];

  return (
    <section className="rounded-[22px] border border-white bg-white p-3 shadow-[0_14px_38px_rgba(15,23,42,0.08)] sm:p-4">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-black text-slate-950">Хураангуй</h2>
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
          Profile
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="group flex min-h-[58px] min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 text-left transition hover:border-orange-100 hover:bg-orange-50/40 focus:outline-none focus:ring-2 focus:ring-orange-200 active:scale-[0.99] md:min-h-[64px]"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${action.className}`}
              >
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-slate-950">
                  {action.label}
                </span>
                <span className="mt-0.5 block truncate text-xs font-bold text-slate-400">
                  {action.meta || action.value}
                </span>
              </span>
              <span className="shrink-0 text-sm font-black text-slate-700 md:hidden">
                {action.value}
              </span>
              <ArrowRight
                size={16}
                className="shrink-0 text-orange-400 transition group-hover:translate-x-0.5"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ProfileRightRail({
  contracts,
  orders,
  points,
  purchases,
}: {
  contracts: AccountContract[];
  orders: ProfileOrder[];
  points: number;
  purchases: AccountPurchase[];
}) {
  return (
    <aside className="space-y-6">
      <section className="rounded-[22px] border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-5 shadow-[0_18px_50px_rgba(249,115,22,0.10)]">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/25">
            <FileArchive size={20} />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950">Миний сан</h2>
            <p className="text-xs font-bold text-slate-400">
              Файл, сургалт, гэрээ
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <RailMetric label="Худалдаж авсан файлууд" value={purchases.length} />
          <RailMetric label="Гэрээ, access" value={contracts.length} />
          <RailMetric label="Нээлттэй захиалга" value={orders.length} />
          <RailMetric label="M point" value={points.toLocaleString("mn-MN")} />
        </div>
      </section>

      <SettingsPanel />
    </aside>
  );
}

function MobileSettingsPanel() {
  return <SettingsPanel compact />;
}

function SettingsPanel({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <section className="rounded-[18px] border border-orange-100 bg-white p-3 shadow-[0_12px_34px_rgba(15,23,42,0.07)] xl:hidden">
        <Link
          href={ACCOUNT_ROUTES.profileSettings}
          className="flex min-h-[64px] min-w-0 items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 transition hover:bg-orange-50/45 active:scale-[0.99]"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
              <Settings size={19} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-black text-slate-950">
                Профайл тохиргоо
              </span>
              <span className="mt-0.5 block truncate text-xs font-bold text-slate-400">
                Нэр, нууцлал, хаягаа засах
              </span>
            </span>
          </span>
          <ArrowRight size={17} className="shrink-0 text-orange-400" />
        </Link>
      </section>
    );
  }

  return (
    <section
      className="rounded-[18px] border border-orange-100 bg-white p-3 shadow-[0_12px_34px_rgba(15,23,42,0.07)] xl:block"
    >
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
            <Settings size={17} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-black text-slate-950">
              Профайл тохиргоо
            </h2>
            <p className="mt-0.5 truncate text-[11px] font-bold text-slate-400">
              Нэр, нууцлал, хаягаа засах
            </p>
          </div>
        </div>
        <Link
          href={ACCOUNT_ROUTES.profileSettings}
          className="hidden h-9 shrink-0 items-center rounded-xl bg-slate-950 px-3 text-xs font-black text-white sm:inline-flex"
        >
          Нээх
        </Link>
      </div>
      <div className="grid gap-2">
        {settingsNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-12 min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 text-sm font-black text-slate-700 transition hover:border-orange-100 hover:bg-orange-50/45 active:scale-[0.99]"
            >
              <span className="inline-flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                  <Icon size={17} />
                </span>
                <span className="truncate">{item.label}</span>
              </span>
              <ArrowRight size={16} className="shrink-0 text-orange-400" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function RailMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <span className="text-sm font-bold leading-5 text-slate-500">
        {label}
      </span>
      <span className="text-lg font-black text-slate-950">{value}</span>
    </div>
  );
}
