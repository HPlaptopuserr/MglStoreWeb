import type { ReactNode } from "react";
import { Flame, Store } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatisticsInsights } from "@/lib/statistics-api";
import { compact, money, windowLabel } from "./statistics-format";

const shorten = (value: string, length = 22) =>
  value.length > length ? `${value.slice(0, length)}…` : value;

export function StatisticsRankingCharts({
  branches,
  products,
  windowDays,
}: {
  branches: StatisticsInsights["topBranches"];
  products: StatisticsInsights["topProducts"];
  windowDays: StatisticsInsights["windowDays"];
}) {
  const branchData = branches.slice(0, 6).map((item, index) => ({
    rank: index + 1,
    name: item.name,
    revenue: item.revenue,
    orders: item.orders,
  }));
  const productData = products.slice(0, 7).map((item, index) => ({
    rank: index + 1,
    name: item.name,
    units: item.units,
    revenue: item.revenue,
  }));

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <RankingCard
        title="Салбарын баталгаажсан борлуулалт"
        description="Төлөгдсөн online order болон completed POS борлуулалтын дүнгээр эрэмбэлэв."
        badge={`${windowLabel(windowDays)} · төгрөг`}
        icon={<Store className="h-5 w-5 text-emerald-600" />}
      >
        {branchData.length === 0 ? (
          <EmptyState text="Сонгосон хугацаанд борлуулалттай салбар алга." />
        ) : (
          <>
            <div className="h-80" aria-label="Салбарын борлуулалтын эрэмбэ">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={branchData}
                  layout="vertical"
                  margin={{ top: 4, right: 18, bottom: 8, left: 12 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={compact}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={150}
                    fontSize={11}
                    tickFormatter={(value: string) => shorten(value)}
                  />
                  <Tooltip
                    cursor={{ fill: "#f0fdf4" }}
                    labelFormatter={(label) => String(label)}
                    formatter={(value) => [
                      money(Number(value)),
                      "Борлуулалтын дүн",
                    ]}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#10b981"
                    radius={[0, 8, 8, 0]}
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <SummaryLine>
              №1 {branchData[0].name} · {money(branchData[0].revenue)} ·{" "}
              {branchData[0].orders.toLocaleString("mn-MN")} гүйлгээ
            </SummaryLine>
          </>
        )}
      </RankingCard>

      <RankingCard
        title="Хамгийн их зарагдсан бараа"
        description="Төлөгдсөн online order болон completed POS-оор зарагдсан ширхэгийн тоогоор эрэмбэлэв."
        badge={`${windowLabel(windowDays)} · ширхэг`}
        icon={<Flame className="h-5 w-5 text-orange-500" />}
      >
        {productData.length === 0 ? (
          <EmptyState text="Сонгосон хугацаанд зарагдсан бараа алга." />
        ) : (
          <>
            <div
              className="h-80"
              aria-label="Хамгийн их зарагдсан барааны эрэмбэ"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={productData}
                  layout="vertical"
                  margin={{ top: 4, right: 18, bottom: 8, left: 12 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={150}
                    fontSize={11}
                    tickFormatter={(value: string) => shorten(value)}
                  />
                  <Tooltip
                    cursor={{ fill: "#fff7ed" }}
                    labelFormatter={(label) => String(label)}
                    formatter={(value) => [
                      `${Number(value).toLocaleString("mn-MN")} ш`,
                      "Зарагдсан тоо",
                    ]}
                  />
                  <Bar
                    dataKey="units"
                    fill="#f97316"
                    radius={[0, 8, 8, 0]}
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <SummaryLine>
              №1 {productData[0].name} ·{" "}
              {productData[0].units.toLocaleString("mn-MN")} ш ·{" "}
              {money(productData[0].revenue)}
            </SummaryLine>
          </>
        )}
      </RankingCard>
    </section>
  );
}

function RankingCard({
  title,
  description,
  badge,
  icon,
  children,
}: {
  title: string;
  description: string;
  badge: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-950">
            {icon}
            {title}
          </h3>
          <p className="mt-1 max-w-xl text-sm font-medium leading-5 text-slate-500">
            {description}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
          {badge}
        </span>
      </div>
      {children}
    </div>
  );
}

function SummaryLine({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-600">
      {children}
    </p>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-80 items-center justify-center rounded-xl bg-slate-50 px-5 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}
