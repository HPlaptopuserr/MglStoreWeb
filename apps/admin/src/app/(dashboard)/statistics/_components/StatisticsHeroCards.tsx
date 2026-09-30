import { StatisticsSummaryCard } from "./StatisticsSummaryCard";
import {
  Activity,
  Boxes,
  LogIn,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { StatisticsInsights } from "@/lib/statistics-api";
import { compact, money } from "./statistics-format";
import { StatisticsTrendBadge } from "./StatisticsTrendBadge";

type HeroCard = {
  label: string;
  value: string;
  trend: number | null;
  icon: LucideIcon;
  tone: string;
  note: string;
};

export function StatisticsHeroCards({
  data,
  loading,
}: {
  data: StatisticsInsights | null;
  loading: boolean;
}) {
  const period = data
    ? data.windowDays === "all"
      ? "Бүх хугацаанд"
      : `Сүүлийн ${data.windowDays} хоногт`
    : "";
  const cards: HeroCard[] = data
    ? [
        {
          label: "Нэвтэрсэн хэрэглэгч",
          value: compact(data.hero.activeUsers),
          trend: data.hero.activeUsersTrend,
          icon: LogIn,
          tone: "bg-emerald-500",
          note: `${period} нэвтэрсэн unique хэрэглэгч`,
        },
        {
          label: "Login session",
          value: compact(data.hero.loginSessions),
          trend: data.hero.loginSessionsTrend,
          icon: Activity,
          tone: "bg-sky-500",
          note: `${period} үүссэн session`,
        },
        {
          label: "Нийт борлуулалт (GMV)",
          value: money(data.hero.totalRevenue),
          trend: data.hero.revenueTrend,
          icon: WalletCards,
          tone: "bg-fuchsia-500",
          note: `${period} баталгаажсан борлуулалтын нийлбэр`,
        },
        {
          label: "Захиалга / POS",
          value: compact(data.hero.totalOrders),
          trend: data.hero.ordersTrend,
          icon: Boxes,
          tone: "bg-amber-500",
          note: `${period} баталгаажсан order + POS`,
        },
      ]
    : [];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {loading && !data
        ? Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl bg-white"
            />
          ))
        : cards.map((card) => (<StatisticsSummaryCard key={card.label} {...card} badge={<StatisticsTrendBadge value={card.trend} />} />))}
    </section>
  );
}
