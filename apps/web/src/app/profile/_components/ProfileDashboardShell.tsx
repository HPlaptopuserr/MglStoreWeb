"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Bell,
  Coins,
  FileArchive,
  FileText,
  Settings,
  ShieldCheck,
  Truck,
  UserRound,
} from "lucide-react";
import type { AccountContract, AccountPurchase, ProfileOrder } from "./types";

type ProfileDashboardShellProps = {
  children: ReactNode;
};

const settingsNav = [
  {
    href: "/profile/settings?section=profile",
    label: "Профайл засах",
    icon: UserRound,
  },
  {
    href: "/profile/settings?section=security",
    label: "Аюулгүй байдал",
    icon: ShieldCheck,
  },
  {
    href: "/profile/settings?section=address",
    label: "Мэдэгдэл, хаяг",
    icon: Bell,
  },
];

export function ProfileDashboardShell({
  children,
}: ProfileDashboardShellProps) {
  return (
    <main className="min-h-screen bg-[#eef2f7] px-4 py-6 text-slate-950 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">{children}</div>
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">{children}</div>
      <ProfileRightRail
        contracts={contracts}
        orders={orders}
        points={points}
        purchases={purchases}
      />
    </div>
  );
}

export function ProfileStatsGrid({
  isMember,
  libraryCount,
  membershipTierLabel,
  ordersCount,
  points,
}: {
  isMember: boolean;
  libraryCount: number;
  membershipTierLabel: string;
  ordersCount: number;
  points: number;
}) {
  const stats = [
    {
      label: "Гишүүнчлэл",
      value: isMember ? membershipTierLabel : "Идэвхгүй",
      helper: isMember ? "Active account" : "Upgrade хийх боломжтой",
      icon: BadgeCheck,
      className: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Файлууд",
      value: `${libraryCount} файл`,
      helper: "Миний санд",
      icon: FileText,
      className: "bg-orange-50 text-orange-600",
    },
    {
      label: "M point",
      value: `${points.toLocaleString("mn-MN")} M`,
      helper: "Point цуглуулах",
      icon: Coins,
      className: "bg-amber-50 text-amber-600",
    },
    {
      label: "Захиалга",
      value: `${ordersCount} захиалга`,
      helper: "Сүүлийн 30 хоногт",
      icon: Truck,
      className: "bg-indigo-50 text-indigo-600",
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <article
            key={stat.label}
            className="rounded-[20px] border border-white bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.08)]"
          >
            <div className="flex items-start justify-between gap-4">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.className}`}
              >
                <Icon size={20} />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {stat.label}
              </span>
            </div>
            <p className="mt-5 text-xl font-black text-slate-950">
              {stat.value}
            </p>
            <p className="mt-2 text-xs font-bold text-slate-400">
              {stat.helper}
            </p>
          </article>
        );
      })}
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

      <section className="rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <Settings size={18} />
          </span>
          <h2 className="text-lg font-black text-slate-950">Тохиргоо</h2>
        </div>
        <div className="space-y-1">
          {settingsNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-2xl px-2 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
              >
                <span className="inline-flex items-center gap-3">
                  <Icon size={17} />
                  {item.label}
                </span>
                <span className="text-slate-300">›</span>
              </Link>
            );
          })}
        </div>
      </section>
    </aside>
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
