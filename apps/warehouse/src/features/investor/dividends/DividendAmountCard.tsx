import type { ReactNode } from "react";
import { Banknote, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import {
  formatWarehouseInvestment,
  type WarehouseMonthlyDividend,
} from "@mgl/types";

interface DividendAmountCardProps {
  dividend: WarehouseMonthlyDividend;
  aggregate?: boolean;
  children?: ReactNode;
}

export function DividendAmountCard({
  dividend,
  aggregate = false,
  children,
}: DividendAmountCardProps) {
  const recorded = dividend.updatedAt !== null;
  return (
    <section
      aria-label="Энэ сарын ногдол ашиг"
      className="relative overflow-hidden rounded-2xl border border-emerald-800/20 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-700 p-5 text-white shadow-lg shadow-emerald-950/10 sm:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-20 size-64 rounded-full border border-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -right-24 size-72 rounded-full border border-white/5"
      />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-medium text-emerald-100">
            <Banknote className="size-5 shrink-0" aria-hidden="true" />
            {aggregate ? "Дэлгүүрийн нийт ногдол ашиг" : "Миний ногдол ашиг"}
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium text-emerald-50">
            {recorded ? (
              <CheckCircle2 className="size-3" aria-hidden="true" />
            ) : (
              <Clock3 className="size-3" aria-hidden="true" />
            )}
            {recorded ? "Бүртгэлтэй" : "Хүлээгдэж байна"}
          </span>
        </div>
        <p className="mt-4 break-words text-3xl font-bold tracking-tight sm:text-4xl">
          {recorded
            ? formatWarehouseInvestment(dividend.amount)
            : "Дүн бүртгэгдээгүй"}
        </p>
        <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs text-emerald-50">
          <ShieldCheck className="size-4" aria-hidden="true" />
          {aggregate ? "Дэлгүүрийн нэгтгэл" : "Зөвхөн миний ногдол ашиг"}
        </span>
        <p className="mt-4 text-xs leading-6 text-emerald-100/80">
          {dividend.month} ·{" "}
          {recorded
            ? "Агуулахаас бүртгэсэн энэ сарын ногдол ашиг."
            : "Агуулахаас энэ сарын дүнг бүртгэхийг хүлээж байна."}
        </p>
        {children}
      </div>
    </section>
  );
}
