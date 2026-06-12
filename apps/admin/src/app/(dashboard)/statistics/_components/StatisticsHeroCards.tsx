import { Activity, Boxes, LogIn, WalletCards, type LucideIcon } from "lucide-react";
import type { StatisticsInsights } from "@/lib/statistics-api";
import { compact, money } from "./statistics-format";
import { StatisticsTrendBadge } from "./StatisticsTrendBadge";

type HeroCard = {
  label: string;
  value: string;
  trend: number;
  icon: LucideIcon;
  tone: string;
};

export function StatisticsHeroCards({
  data,
  loading,
}: {
  data: StatisticsInsights | null;
  loading: boolean;
}) {
  const cards: HeroCard[] = data
    ? [
        {
          label: "Нэвтэрсэн хэрэглэгч",
          value: compact(data.hero.activeUsers),
          trend: data.hero.activeUsersTrend,
          icon: LogIn,
          tone: "bg-emerald-500",
        },
        {
          label: "Login session",
          value: compact(data.hero.loginSessions),
          trend: data.hero.loginSessionsTrend,
          icon: Activity,
          tone: "bg-sky-500",
        },
        {
          label: "Борлуулалтын орлого",
          value: money(data.hero.totalRevenue),
          trend: data.hero.revenueTrend,
          icon: WalletCards,
          tone: "bg-fuchsia-500",
        },
        {
          label: "Захиалга / POS",
          value: compact(data.hero.totalOrders),
          trend: data.hero.ordersTrend,
          icon: Boxes,
          tone: "bg-amber-500",
        },
      ]
    : [];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {loading && !data
        ? Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-white" />
          ))
        : cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.tone} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <StatisticsTrendBadge value={card.trend} />
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-slate-500">{card.label}</p>
                <p className="mt-1 truncate text-2xl font-black text-slate-950">{card.value}</p>
              </div>
            );
          })}
    </section>
  );
}
