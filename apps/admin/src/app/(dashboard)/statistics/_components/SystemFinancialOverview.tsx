import {
  BadgeCheck,
  BanknoteArrowUp,
  Building2,
  CircleDollarSign,
  FileCheck2,
  MonitorSmartphone,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import type { StatisticsInsights } from "@/lib/statistics-api";
import { compact, money, windowLabel } from "./statistics-format";
import { StatisticsTrendBadge } from "./StatisticsTrendBadge";

type FinancialOverview = StatisticsInsights["financialOverview"];

const sourceMeta = {
  onlineOrders: {
    label: "Төлөгдсөн online order",
    icon: ShoppingBag,
    tone: "bg-sky-500",
  },
  posSales: {
    label: "Completed POS",
    icon: MonitorSmartphone,
    tone: "bg-violet-500",
  },
  paidInvoices: {
    label: "Төлөгдсөн invoice",
    icon: FileCheck2,
    tone: "bg-amber-500",
  },
} as const;

export function SystemFinancialOverview({
  overview,
  loading,
}: {
  overview: FinancialOverview | null;
  loading: boolean;
}) {
  if (loading && !overview) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-7 w-72 animate-pulse rounded-lg bg-slate-100" />
        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
      </section>
    );
  }

  if (!overview) return null;

  const sources = Object.entries(overview.sources) as [
    keyof FinancialOverview["sources"],
    FinancialOverview["sources"][keyof FinancialOverview["sources"]],
  ][];
  const total = Math.max(overview.confirmedAmount, 1);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-5 text-white lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="flex items-center gap-2 text-xl font-black">
              <CircleDollarSign className="h-5 w-5 text-emerald-300" />
              System Financial Overview
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Нэргүйжүүлсэн aggregate
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-300">
            {overview.note}
          </p>
        </div>
        <div className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300">
          {windowLabel(overview.windowDays)} · Банкны данс холбогдоогүй
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 lg:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                  Баталгаажсан нийт урсгал
                </p>
                <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  {money(overview.confirmedAmount)}
                </p>
              </div>
              <StatisticsTrendBadge value={overview.amountTrend} />
            </div>
            <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-emerald-100">
              {sources.map(([key, source]) => (
                <span
                  key={key}
                  className={sourceMeta[key].tone}
                  style={{
                    width: `${Math.max(0, (source.amount / total) * 100)}%`,
                  }}
                />
              ))}
            </div>
            <p className="mt-2 text-xs font-semibold text-emerald-800/70">
              Pending, failed, cancelled болон local fake төлбөр ороогүй.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Баталгаажсан гүйлгээ
                </p>
                <p className="mt-2 text-3xl font-black text-slate-950">
                  {compact(overview.confirmedTransactions)}
                </p>
              </div>
              <StatisticsTrendBadge value={overview.transactionTrend} />
            </div>
            <p className="mt-5 text-xs font-semibold leading-5 text-slate-500">
              Нэр, байгууллагын ID, данс болон хэрэглэгчийн мэдээлэл response-д
              агуулагдахгүй.
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {sources.map(([key, source]) => {
            const Icon = sourceMeta[key].icon;
            return (
              <div
                key={key}
                className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${sourceMeta[key].tone}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-xs font-black uppercase text-slate-500">
                  {sourceMeta[key].label}
                </p>
                <p className="mt-1 text-xl font-black text-slate-950">
                  {money(source.amount)}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {compact(source.transactions)} баталгаажсан гүйлгээ
                </p>
              </div>
            );
          })}

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xs font-black uppercase text-blue-700">
              Provider-оор баталгаажсан QPay
            </p>
            <p className="mt-1 text-xl font-black text-slate-950">
              {money(overview.verifiedQPay.amount)}
            </p>
            <p className="mt-1 text-xs font-semibold text-blue-700/70">
              {compact(overview.verifiedQPay.transactions)} callback/status
              confirmation · нийтэд дахин нэмээгүй
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 text-xs font-bold text-slate-500">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
            <Building2 className="h-3.5 w-3.5" /> Байгууллагын задаргаа хаалттай
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
            <BanknoteArrowUp className="h-3.5 w-3.5" /> Банкны бодит үлдэгдэл
            биш
          </span>
        </div>
      </div>
    </section>
  );
}
