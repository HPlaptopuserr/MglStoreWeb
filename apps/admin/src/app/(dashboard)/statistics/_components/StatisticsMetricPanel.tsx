import { ChevronDown, ChevronUp, Download, Target } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatisticsInsights } from "@/lib/statistics-api";
import { compact, metricValue, windowLabel } from "./statistics-format";
import { StatisticsTrendBadge } from "./StatisticsTrendBadge";

type Metric = StatisticsInsights["marketingMetrics"][number];

const metricScopeLabel: Record<Metric["scope"], string> = {
  SELECTED_PERIOD: "Сонгосон хугацаа",
  CURRENT_SNAPSHOT: "Одоогийн төлөв",
  LIFETIME: "Бүх хугацааны counter",
};

function ExpandedMetricDetails({
  metric,
  windowDays,
}: {
  metric: Metric;
  windowDays: StatisticsInsights["windowDays"];
}) {
  const hasComparison = metric.previousValue != null && windowDays !== "all";
  const previousValue = metric.previousValue ?? 0;
  const difference = metric.value - previousValue;
  const comparisonPeriodLabel =
    typeof windowDays === "number"
      ? `Сүүлийн ${windowDays} хоногийг өмнөх ${windowDays} хоногтой харьцуулсан нь`
      : "Бүх хугацааны баталгаажсан дүн";
  const chartData = [
    { name: "Өмнөх үе", value: previousValue, tone: "previous" },
    { name: "Одоогийн үе", value: metric.value, tone: "current" },
  ];

  const comparisonMessage = !hasComparison
    ? "Энэ үзүүлэлт өмнөх хугацаатай харьцуулагдахгүй."
    : previousValue === 0 && metric.value > 0
      ? `Өмнөх үед бүртгэлгүй байсан бөгөөд энэ үед ${metricValue(metric.value, metric.unit)} шинээр бүртгэгдсэн.`
      : difference === 0
        ? "Өмнөх ижил хугацаатай өөрчлөлтгүй байна."
        : `${difference > 0 ? "Өмнөх үеэс өссөн" : "Өмнөх үеэс буурсан"}: ${metricValue(Math.abs(difference), metric.unit)}.`;

  return (
    <div
      id={`metric-details-${metric.id}`}
      className="grid gap-5 border-t border-lime-200 px-4 pb-4 pt-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-lime-700">
            Дэлгэрэнгүй тайлбар
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            {metric.description}
          </p>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <dt className="text-[11px] font-black uppercase text-slate-400">
              Хэмжилтийн хүрээ
            </dt>
            <dd className="mt-1 text-sm font-black text-slate-800">
              {metricScopeLabel[metric.scope]}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <dt className="text-[11px] font-black uppercase text-slate-400">
              Өгөгдлийн эх үүсвэр
            </dt>
            <dd className="mt-1 break-words text-sm font-black text-slate-800">
              {metric.source}
            </dd>
          </div>
          {hasComparison && (
            <div className="rounded-xl border border-slate-200 bg-white p-3 sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <dt className="text-[11px] font-black uppercase text-slate-400">
                Өмнөх ижил хугацаа
              </dt>
              <dd className="mt-1 text-lg font-black text-slate-800">
                {metricValue(previousValue, metric.unit)}
              </dd>
            </div>
          )}
        </dl>
      </div>
      {hasComparison ? (
        <div className="min-h-64 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="mb-4">
            <div>
              <p className="text-xs font-black uppercase text-slate-400">
                Хугацааны харьцуулалт
              </p>
              <p className="mt-1 text-sm font-bold text-slate-600">
                {comparisonPeriodLabel}
              </p>
            </div>
          </div>
          <dl className="mb-3 grid grid-cols-3 gap-2">
            <ComparisonValue
              label="Өмнөх үе"
              value={metricValue(previousValue, metric.unit)}
              tone="neutral"
            />
            <ComparisonValue
              label="Одоогийн үе"
              value={metricValue(metric.value, metric.unit)}
              tone="current"
            />
            <ComparisonValue
              label="Зөрүү"
              value={`${difference > 0 ? "+" : difference < 0 ? "−" : ""}${metricValue(Math.abs(difference), metric.unit)}`}
              tone={
                difference > 0
                  ? "positive"
                  : difference < 0
                    ? "negative"
                    : "neutral"
              }
            />
          </dl>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-600">
            {comparisonMessage}
          </p>
          <div className="h-52 sm:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -12, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tickFormatter={compact}
                />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  formatter={(value) => [
                    metricValue(Number(value), metric.unit),
                    metric.label,
                  ]}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={180}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.tone === "current" ? "#65a30d" : "#cbd5e1"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <MetricSnapshotSummary metric={metric} windowDays={windowDays} />
      )}
    </div>
  );
}

function MetricSnapshotSummary({
  metric,
  windowDays,
}: {
  metric: Metric;
  windowDays: StatisticsInsights["windowDays"];
}) {
  const title =
    metric.scope === "CURRENT_SNAPSHOT"
      ? "Одоогийн бодит төлөв"
      : metric.scope === "LIFETIME"
        ? "Бүх хугацааны хуримтлагдсан дүн"
        : `${windowLabel(windowDays)}-ийн дүн`;
  const explanation =
    metric.scope === "CURRENT_SNAPSHOT"
      ? "Энэ нь хугацааны урсгал биш. Системээс яг одоо тооцсон бодит төлөв тул өмнөх 90 хоногтой харьцуулах график харуулахгүй."
      : metric.scope === "LIFETIME"
        ? "Энэ нь систем ашиглаж эхэлснээс хойших хуримтлагдсан үзүүлэлт тул сонгосон хугацаатай харьцуулахгүй."
        : "Өмнөх ижил хугацааны баталгаатай дата байхгүй тул буруу харьцуулалт үзүүлэхгүй.";

  return (
    <div className="flex min-h-56 flex-col justify-center rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">
        {metricValue(metric.value, metric.unit)}
      </p>
      <p className="mt-4 max-w-xl rounded-xl bg-sky-50 px-4 py-3 text-sm font-bold leading-6 text-sky-900">
        {explanation}
      </p>
    </div>
  );
}

function ComparisonValue({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "current" | "positive" | "negative";
}) {
  const toneClass = {
    neutral: "border-slate-200 bg-slate-50 text-slate-800",
    current: "border-lime-200 bg-lime-50 text-lime-800",
    positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
    negative: "border-red-200 bg-red-50 text-red-700",
  }[tone];

  return (
    <div className={`min-w-0 rounded-lg border p-2.5 ${toneClass}`}>
      <dt className="text-[10px] font-black uppercase tracking-wide opacity-70">
        {label}
      </dt>
      <dd
        className="mt-1 truncate text-sm font-black sm:text-base"
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

export function StatisticsMetricPanel({
  data,
  loading,
  metricGroups,
  selectedMetricId,
  onMetricSelect,
  onExport,
}: {
  data: StatisticsInsights | null;
  loading: boolean;
  metricGroups: [string, Metric[]][];
  selectedMetricId: string | null;
  onMetricSelect: (id: string) => void;
  onExport: () => void;
}) {
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
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl bg-slate-100"
            />
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
                <h4 className="text-sm font-black uppercase text-slate-600">
                  {category}
                </h4>
                {category === "Revenue" && data && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black normal-case text-blue-700">
                    {data.windowDays === "all"
                      ? "Бүх хугацааны нийлбэр"
                      : `Сүүлийн ${data.windowDays} хоногийн нийлбэр`}
                  </span>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {metrics.map((item) => {
                  const isExpanded = selectedMetricId === item.id;

                  return (
                    <article
                      key={item.id}
                      className={`overflow-hidden rounded-xl border text-left transition-all duration-300 ${
                        isExpanded
                          ? "md:col-span-2 xl:col-span-4 border-lime-300 bg-lime-50 shadow-lg shadow-lime-100/70 ring-2 ring-lime-100"
                          : "border-slate-200 bg-slate-50 hover:-translate-y-0.5 hover:shadow-md"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onMetricSelect(item.id)}
                        aria-expanded={isExpanded}
                        aria-controls={`metric-details-${item.id}`}
                        className="w-full p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime-500 sm:p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-black uppercase text-slate-500">
                            {item.label}
                          </p>
                          <div className="flex items-center gap-2">
                            <StatisticsTrendBadge value={item.trend} />
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-lime-700" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                        </div>
                        <p className="mt-2 truncate text-2xl font-black text-slate-950">
                          {metricValue(item.value, item.unit)}
                        </p>
                        <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
                          {item.description}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2">
                          <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600 ring-1 ring-slate-200">
                            {metricScopeLabel[item.scope]}
                          </span>
                          <span
                            title={item.source}
                            className="truncate text-[10px] font-bold text-slate-400"
                          >
                            {item.source}
                          </span>
                        </div>
                      </button>
                      {isExpanded && data && (
                        <ExpandedMetricDetails
                          metric={item}
                          windowDays={data.windowDays}
                        />
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
