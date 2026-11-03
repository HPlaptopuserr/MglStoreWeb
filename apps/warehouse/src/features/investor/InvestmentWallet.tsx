import Link from "next/link";
import { Wallet, ShieldCheck, CirclePlus, Banknote } from "lucide-react";
import {
  formatWarehouseInvestment,
  type WarehouseInvestmentSummary,
} from "@mgl/types";

export function InvestmentWallet({
  investment,
  onTopUp,
  onDividend,
}: {
  investment: WarehouseInvestmentSummary;
  onTopUp?: () => void;
  onDividend?: () => void;
}) {
  return (
    <section
      aria-label="Хөрөнгө оруулалтын дүн"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-6 text-white shadow-lg shadow-blue-950/10 sm:p-8"
    >
      <div className="pointer-events-none absolute -right-12 -top-16 size-64 rounded-full border border-white/10" />
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-blue-100">
            <Wallet className="size-5" />
            {investment.scope === "PERSONAL"
              ? "Миний хөрөнгө оруулалт"
              : "Дэлгүүрийн нийт хөрөнгө оруулалт"}
          </p>
          <p className="mt-4 break-all text-3xl font-bold tracking-tight sm:text-4xl">
            {formatWarehouseInvestment(investment.amount)}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs text-blue-50">
          <ShieldCheck className="size-4" />
          {investment.scope === "PERSONAL"
            ? "Зөвхөн миний дүн"
            : "Нэгтгэсэн дүн"}
        </span>
      </div>
      {investment.monthlyDividend && (
        <div className="relative mt-5 rounded-xl border border-emerald-300/20 bg-gradient-to-br from-emerald-950/70 to-teal-800/70 p-3">
          <p className="flex items-center gap-2 text-xs text-emerald-100">
            <Banknote className="size-4" aria-hidden="true" />
            Энэ сарын ногдол ашиг · {investment.monthlyDividend.month}
          </p>
          <p className="mt-1 text-lg font-semibold">
            {investment.monthlyDividend.updatedAt
              ? formatWarehouseInvestment(investment.monthlyDividend.amount)
              : "Дүн бүртгэгдээгүй"}
          </p>
        </div>
      )}
      {investment.scope === "WAREHOUSE" && (
        <Link
          href="/viewers#investment-top-up"
          className="relative mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          <CirclePlus className="size-4" />
          Цэнэглэх
        </Link>
      )}
      {investment.scope === "PERSONAL" && onTopUp && (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={onTopUp}
          className="relative mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          <CirclePlus className="size-4" aria-hidden="true" /> Цэнэглэх
        </button>
      )}
      {investment.scope === "PERSONAL" && onDividend && (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={onDividend}
          className="relative mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:ml-2"
        >
          <Banknote className="size-4" aria-hidden="true" /> Ногдол ашиг
        </button>
      )}
      <div className="relative mt-6 flex flex-wrap justify-between gap-2 border-t border-white/10 pt-4 text-xs leading-5 text-blue-100/70">
        <span>
          Төлөв: {investment.updatedAt ? "Бүртгэлтэй" : "Дүн бүртгэгдээгүй"}
        </span>
        <span>Зарцуулах үлдэгдэл болон ашиг ороогүй.</span>
        <span>
          {investment.updatedAt
            ? `Шинэчилсэн: ${new Date(investment.updatedAt).toLocaleString("mn-MN", { timeZone: "Asia/Ulaanbaatar" })}`
            : "Хөрөнгө оруулалтын дүн бүртгэгдээгүй байна."}
        </span>
      </div>
    </section>
  );
}
