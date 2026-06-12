import { Download, Target } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StatisticsInsights } from "@/lib/statistics-api";
import { compact, metricValue, windowLabel } from "./statistics-format";
import { StatisticsTrendBadge } from "./StatisticsTrendBadge";

type Metric = StatisticsInsights["marketingMetrics"][number];

export function StatisticsMetricPanel({
  data,
  loading,
  metricGroups,
  selectedMetric,
  selectedMetricId,
  onMetricSelect,
  onExport,
}: {
  data: StatisticsInsights | null;
  loading: boolean;
  metricGroups: [string, Metric[]][];
  selectedMetric: Metric | null;
  selectedMetricId: string | null;
  onMetricSelect: (id: string) => void;
  onExport: () => void;
}) {
  const selectedMetricChart = selectedMetric
    ? selectedMetric.previousValue == null || data?.windowDays === "all"
      ? [{ name: windowLabel(data?.windowDays ?? "all"), value: selectedMetric.value }]
      : [
          { name: "Өмнөх", value: selectedMetric.previousValue },
          { name: "Одоогийн", value: selectedMetric.value },
        ]
    : [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-950">
            <Target className="h-5 w-5 text-lime-500" />
            Бодит системийн үзүүлэлт
          </h3>
          <p className="text-sm font-medium text-slate-500">
            Нэвтрэлт, байгууллага, орлого, бараа, үйлчилгээний aggregate дата
          </p>
        </div>
        <button
          onClick={onExport}
          disabled={!data}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Тайлан татах
        </button>
      </div>
      {loading && !data ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : metricGroups.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
          Сонгосон хугацаанд статистик үзүүлэлт олдсонгүй.
        </p>
      ) : (
        <div className="space-y-5">
          {metricGroups.map(([category, metrics]) => (
            <div key={category}>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-lime-400" />
                <h4 className="text-sm font-black uppercase text-slate-600">{category}</h4>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {metrics.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onMetricSelect(item.id)}
                    className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                      (selectedMetricId ?? selectedMetric?.id) === item.id
                        ? "border-lime-300 bg-lime-50 ring-2 ring-lime-100"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-black uppercase text-slate-500">{item.label}</p>
                      <StatisticsTrendBadge value={item.trend} />
                    </div>
                    <p className="mt-2 truncate text-2xl font-black text-slate-950">
                      {metricValue(item.value, item.unit)}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
                      {item.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {selectedMetric && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h4 className="text-base font-black text-slate-950">{selectedMetric.label}</h4>
                  <p className="text-sm font-semibold text-slate-500">{selectedMetric.description}</p>
                </div>
                <p className="text-2xl font-black text-slate-950">
                  {metricValue(selectedMetric.value, selectedMetric.unit)}
                </p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={selectedMetricChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={compact} />
                    <Tooltip formatter={(value) => metricValue(Number(value), selectedMetric.unit)} />
                    <Bar dataKey="value" fill="#65a30d" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
