import Link from "next/link";
import { ArrowUpRight, Store } from "lucide-react";
import type { SalesStoreSummary } from "@/lib/admin-sales-stores-api";
import { windowLabel } from "./statistics-format";
export function SalesStoreSummaryCards({
  data,
  days,
}: {
  data: SalesStoreSummary;
  days: number | "all";
}) {
  const cards = [
    {
      label: "Нийт дэлгүүр",
      value: data.total,
      description: "Бүх бүртгэл",
      href: "/statistics/stores?days=all",
    },
    {
      label: "Идэвхтэй дэлгүүр",
      value: data.active,
      description: "Бүх хугацааны идэвхтэй бүртгэл",
      href: "/statistics/stores?days=all&status=active",
    },
    {
      label: days === "all" ? "Бүртгэсэн дэлгүүр" : "Шинээр бүртгэсэн",
      value: data.registered,
      description: windowLabel(days),
      href: `/statistics/stores?days=${days}`,
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          className="group rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-lime-300 hover:bg-lime-50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-600"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-600">
              {card.label}
            </span>
            <ArrowUpRight
              aria-hidden="true"
              className="h-4 w-4 text-slate-400 group-hover:text-lime-700"
            />
          </div>
          <p className="mt-2 text-3xl font-black tabular-nums text-slate-950">
            {card.value.toLocaleString("mn-MN")}
          </p>
          <p className="mt-1 text-xs text-slate-500">{card.description}</p>
        </Link>
      ))}
    </div>
  );
}
export function SalesStoreSummaryHeading() {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h3
        id="store-summary-heading"
        className="flex items-center gap-2 text-lg font-black text-slate-950"
      >
        <Store aria-hidden="true" className="h-5 w-5 text-lime-700" />
        MGL Store-ууд
      </h3>
      <Link
        href="/statistics/stores?days=all"
        className="rounded-lg px-2 py-1 text-sm font-semibold text-lime-800 transition hover:bg-lime-50 focus-visible:outline-2 focus-visible:outline-lime-600"
      >
        Дэлгүүрүүдийг харах →
      </Link>
    </div>
  );
}
