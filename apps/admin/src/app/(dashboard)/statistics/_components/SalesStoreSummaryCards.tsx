import { StatisticsSummaryCard } from "./StatisticsSummaryCard";
import Link from "next/link";
import { Store, CircleCheck, Plus } from "lucide-react";
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
      value: data.total, icon: Store, tone: "bg-sky-500",
      description: "Бүх бүртгэл",
      href: "/statistics/stores?days=all",
    },
    {
      label: "Идэвхтэй дэлгүүр",
      value: data.active, icon: CircleCheck, tone: "bg-emerald-500",
      description: "Бүх хугацааны идэвхтэй бүртгэл",
      href: "/statistics/stores?days=all&status=active",
    },
    {
      label: days === "all" ? "Бүртгэсэн дэлгүүр" : "Шинээр бүртгэсэн",
      value: data.registered, icon: Plus, tone: "bg-violet-500",
      description: windowLabel(days),
      href: `/statistics/stores?days=${days}`,
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <StatisticsSummaryCard key={card.label} label={card.label} value={card.value.toLocaleString("mn-MN")} note={card.description} icon={card.icon} tone={card.tone} href={card.href} />
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

        MGL Store-ууд
      </h3>
      <Link
        href="/statistics/stores?days=all"
        className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-sky-600"
      >
        Дэлгүүрүүдийг харах →
      </Link>
    </div>
  );
}
