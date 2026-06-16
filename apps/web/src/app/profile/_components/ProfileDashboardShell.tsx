"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
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
  contractsCount,
  filesCount,
  isMember,
  libraryCount,
  membershipTierLabel,
  onLibraryClick,
  onMembershipClick,
  onOrdersClick,
  onPointsClick,
  openOrdersCount,
  ordersCount,
  points,
  transactionsCount,
}: {
  contractsCount: number;
  filesCount: number;
  isMember: boolean;
  libraryCount: number;
  membershipTierLabel: string;
  onLibraryClick: () => void;
  onMembershipClick: () => void;
  onOrdersClick: () => void;
  onPointsClick: () => void;
  openOrdersCount: number;
  ordersCount: number;
  points: number;
  transactionsCount: number;
}) {
  const stats = [
    {
      label: "Гишүүнчлэл",
      value: isMember ? membershipTierLabel : "Идэвхгүй",
      helper: isMember
        ? "Идэвхтэй эрх, хөнгөлөлт нээгдсэн"
        : "Upgrade хийж эрхээ нээнэ",
      details: isMember
        ? ["Premium benefit идэвхтэй", "M point давхар цугларна"]
        : ["Төлбөрөө баталгаажуулна", "Файл, сургалт, хөнгөлөлт нээгдэнэ"],
      actionLabel: isMember ? "Дэлгэрэнгүй" : "Идэвхжүүлэх",
      icon: BadgeCheck,
      className: "bg-emerald-50 text-emerald-600",
      onClick: isMember ? onLibraryClick : onMembershipClick,
    },
    {
      label: "Файлууд",
      value: `${libraryCount} файл`,
      helper: "Миний сан руу орно",
      details: [
        `${filesCount} худалдан авсан файл`,
        `${contractsCount} гэрээ, access`,
      ],
      actionLabel: "Сангаа харах",
      icon: FileText,
      className: "bg-orange-50 text-orange-600",
      onClick: onLibraryClick,
    },
    {
      label: "M point",
      value: `${points.toLocaleString("mn-MN")} M`,
      helper: "Оноо, гүйлгээний түүх",
      details: [
        `${transactionsCount} гүйлгээ бүртгэлтэй`,
        "Худалдан авалтаас point цугларна",
      ],
      actionLabel: "Түүх харах",
      icon: Coins,
      className: "bg-amber-50 text-amber-600",
      onClick: onPointsClick,
    },
    {
      label: "Захиалга",
      value: `${ordersCount} захиалга`,
      helper: `${openOrdersCount} нээлттэй`,
      details: [
        `${ordersCount} нийт захиалга`,
        openOrdersCount > 0
          ? "Явцтай захиалга байна"
          : "Идэвхтэй захиалга алга",
      ],
      actionLabel: "Захиалга харах",
      icon: Truck,
      className: "bg-indigo-50 text-indigo-600",
      onClick: onOrdersClick,
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <button
            key={stat.label}
            type="button"
            onClick={stat.onClick}
            className="group min-w-0 rounded-[18px] border border-white bg-white p-3.5 text-left shadow-[0_12px_34px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-orange-100 hover:shadow-[0_18px_46px_rgba(15,23,42,0.11)] focus:outline-none focus:ring-2 focus:ring-orange-300 sm:p-5 sm:shadow-[0_16px_45px_rgba(15,23,42,0.08)]"
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${stat.className}`}
              >
                <Icon size={18} />
              </span>
              <span className="min-w-0 truncate text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px]">
                {stat.label}
              </span>
            </div>
            <p className="mt-4 truncate text-lg font-black text-slate-950 sm:mt-5 sm:text-xl">
              {stat.value}
            </p>
            <p className="mt-1 truncate text-[11px] font-bold text-slate-400 sm:mt-2 sm:text-xs">
              {stat.helper}
            </p>
            <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
              {stat.details.map((detail) => (
                <p
                  key={detail}
                  className="line-clamp-1 text-[10px] font-bold leading-4 text-slate-500 sm:text-[11px]"
                >
                  {detail}
                </p>
              ))}
            </div>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-black text-orange-500 transition group-hover:gap-2 sm:text-xs">
              {stat.actionLabel}
              <ArrowRight size={13} />
            </span>
          </button>
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

function MobileSettingsPanel() {
  return (
    <section className="rounded-[18px] border border-white bg-white p-3.5 shadow-[0_12px_34px_rgba(15,23,42,0.07)] xl:hidden">
      <div className="mb-3 flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <Settings size={17} />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-black text-slate-950">
            Профайл тохиргоо
          </h2>
          <p className="mt-0.5 truncate text-[11px] font-bold text-slate-400">
            Нэр, нууцлал, хаягаа хурдан засах
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {settingsNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-[78px] min-w-0 flex-col items-center justify-center gap-2 rounded-2xl bg-slate-50 px-2 text-center text-[11px] font-black leading-4 text-slate-600 transition active:scale-[0.98] active:bg-slate-100"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                <Icon size={17} />
              </span>
              <span className="line-clamp-2">{item.label}</span>
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
