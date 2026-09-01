"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Bell,
  Building2,
  Coins,
  FileArchive,
  FileText,
  Heart,
  Home,
  Settings,
  ShoppingBag,
  ShieldCheck,
  Truck,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { ACCOUNT_ROUTES, PROFILE_SETTING_LINKS } from "@/lib/account-routes";
import type { AccountContract, AccountPurchase, ProfileOrder } from "./types";

type ProfileDashboardShellProps = {
  children: ReactNode;
  bankAccountContent?: ReactNode;
  incomingOrdersContent?: ReactNode;
  openIncomingOrdersInitially?: boolean;
  organizationContext?: {
    id: string;
    name: string;
  };
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
  bankAccountContent,
  incomingOrdersContent,
  openIncomingOrdersInitially = false,
  organizationContext,
}: ProfileDashboardShellProps) {
  const [isBankAccountOpen, setIsBankAccountOpen] = useState(false);
  const [isIncomingOrdersOpen, setIsIncomingOrdersOpen] = useState(
    openIncomingOrdersInitially,
  );
  const modalOpen = isBankAccountOpen || isIncomingOrdersOpen;

  useEffect(() => {
    if (!modalOpen) return;
    const scrollY = window.scrollY;
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousBodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsBankAccountOpen(false);
        setIsIncomingOrdersOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyStyles.overflow;
      document.body.style.position = previousBodyStyles.position;
      document.body.style.top = previousBodyStyles.top;
      document.body.style.width = previousBodyStyles.width;
      window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen]);

  return (
    <>
      <main className="min-h-screen bg-[#f5f5f5] px-3 pb-28 pt-4 text-slate-950 md:px-6 md:pb-8 md:pt-8">
        <div className="mx-auto grid max-w-7xl items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <ProfileNavigation
            organizationContext={organizationContext}
            onBankAccountOpen={
              bankAccountContent ? () => setIsBankAccountOpen(true) : undefined
            }
            onIncomingOrdersOpen={
              incomingOrdersContent
                ? () => setIsIncomingOrdersOpen(true)
                : undefined
            }
          />
          <div className="min-w-0 space-y-4 md:space-y-6">{children}</div>
        </div>
      </main>
      {isBankAccountOpen && bankAccountContent ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center overflow-hidden overscroll-none bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Банкны дансны тохиргоо"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target)
              setIsBankAccountOpen(false);
          }}
        >
          <div className="relative w-full max-w-4xl overflow-visible rounded-t-[30px] bg-white p-3 shadow-2xl sm:rounded-[30px] sm:p-4">
            <button
              type="button"
              onClick={() => setIsBankAccountOpen(false)}
              className="absolute -right-2 -top-12 z-10 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-600 shadow-lg transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-slate-200 sm:-right-3 sm:-top-3"
              aria-label="Хаах"
            >
              <X className="h-5 w-5" />
            </button>
            {bankAccountContent}
          </div>
        </div>
      ) : null}
      {isIncomingOrdersOpen && incomingOrdersContent ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center overflow-hidden overscroll-none bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Ирсэн захиалга"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target)
              setIsIncomingOrdersOpen(false);
          }}
        >
          <div className="relative w-full max-w-5xl rounded-t-[30px] bg-white p-3 shadow-2xl sm:rounded-[30px] sm:p-4">
            <button
              type="button"
              onClick={() => setIsIncomingOrdersOpen(false)}
              className="absolute -right-2 -top-12 z-10 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-600 shadow-lg transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-slate-200 sm:-right-3 sm:-top-3"
              aria-label="Хаах"
            >
              <X className="h-5 w-5" />
            </button>
            {incomingOrdersContent}
          </div>
        </div>
      ) : null}
    </>
  );
}

const profileNavItems = [
  { label: "Миний профайл", href: ACCOUNT_ROUTES.profile, icon: Home },
  { label: "Миний захиалга", href: ACCOUNT_ROUTES.orders, icon: Truck },
  {
    label: "Хадгалсан зүйлс",
    href: ACCOUNT_ROUTES.profileLibrary,
    icon: Heart,
  },
  {
    label: "Миний сан",
    href: ACCOUNT_ROUTES.profileLibrary,
    icon: FileArchive,
  },
  {
    label: "Гишүүнчлэл",
    href: ACCOUNT_ROUTES.profileLibrary,
    icon: WalletCards,
  },
  {
    label: "Профайл тохиргоо",
    href: ACCOUNT_ROUTES.profileSettings,
    icon: Settings,
  },
] as const;

function ProfileNavigation({
  onBankAccountOpen,
  onIncomingOrdersOpen,
  organizationContext,
}: {
  onBankAccountOpen?: () => void;
  onIncomingOrdersOpen?: () => void;
  organizationContext?: {
    id: string;
    name: string;
  };
}) {
  if (organizationContext) {
    const organizationHref = `/profile/organizations/${encodeURIComponent(
      organizationContext.id,
    )}`;
    const organizationItems = [
      {
        label: "Байгууллагын нүүр",
        href: organizationHref,
        icon: Building2,
      },
      ...(onIncomingOrdersOpen
        ? [
            {
              label: "Ирсэн захиалга",
              icon: ShoppingBag,
              onClick: onIncomingOrdersOpen,
            },
          ]
        : []),
      ...(onBankAccountOpen
        ? [
            {
              label: "Төлбөрийн данс",
              icon: Banknote,
              onClick: onBankAccountOpen,
            },
          ]
        : []),
    ];

    return (
      <aside className="sticky top-[9rem] hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:block">
        <div className="border-b border-slate-100 px-3 pb-3 pt-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">
            MGL Business
          </p>
          <h2 className="mt-1 truncate text-lg font-black text-slate-950">
            {organizationContext.name}
          </h2>
          <p className="mt-1 text-[11px] font-bold text-slate-400">
            Байгууллагын удирдлага
          </p>
        </div>
        <nav aria-label="Байгууллагын цэс" className="mt-2 space-y-1">
          {organizationItems.map((item) => {
            const Icon = item.icon;
            return "onClick" in item ? (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className="flex min-h-11 items-center gap-3 rounded-xl bg-emerald-50 px-3 text-sm font-bold text-emerald-800"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <Link
          href={ACCOUNT_ROUTES.profile}
          className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
        >
          Хувийн хэсэг рүү буцах
        </Link>
      </aside>
    );
  }

  const navigationItems = [
    ...profileNavItems.slice(0, 2),
    ...(onIncomingOrdersOpen
      ? [
          {
            label: "Ирсэн захиалга",
            href: "",
            icon: ShoppingBag,
            onClick: onIncomingOrdersOpen,
          },
        ]
      : []),
    ...profileNavItems.slice(2, -1),
    ...(onBankAccountOpen
      ? [
          {
            label: "Банкны данс",
            href: "",
            icon: Banknote,
            onClick: onBankAccountOpen,
          },
        ]
      : []),
    profileNavItems.at(-1)!,
  ];

  return (
    <aside className="sticky top-[9rem] hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:block">
      <div className="border-b border-slate-100 px-3 pb-3 pt-1">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-500">
          My MGL Store
        </p>
        <h2 className="mt-1 text-lg font-black text-slate-950">Миний хэсэг</h2>
      </div>
      <nav aria-label="Хэрэглэгчийн цэс" className="mt-2 space-y-1">
        {navigationItems.map((item, index) => {
          const Icon = item.icon;
          return "onClick" in item ? (
            <button
              key={`${item.label}-${index}`}
              type="button"
              onClick={item.onClick}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ) : (
            <Link
              key={`${item.label}-${index}`}
              href={item.href}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${
                index === 0
                  ? "bg-orange-50 text-orange-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <Link
        href="/products"
        className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-3 text-sm font-black text-white transition hover:bg-orange-500"
      >
        Дэлгүүр хэсэх
      </Link>
    </aside>
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
      meta:
        openOrdersCount > 0 ? `${openOrdersCount} нээлттэй` : "Идэвхтэй алга",
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
    <section className="rounded-[18px] border border-orange-100 bg-white p-3 shadow-[0_12px_34px_rgba(15,23,42,0.07)] xl:block">
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
