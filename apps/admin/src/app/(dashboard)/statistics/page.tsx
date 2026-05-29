"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Boxes,
  Download,
  FileSpreadsheet,
  FileText,
  Flame,
  LogIn,
  Package,
  RefreshCw,
  Search,
  Sparkles,
  Store,
  Target,
  Trophy,
  WalletCards,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchStatisticsInsights, type StatisticsInsights } from "@/lib/statistics-api";

type StatisticsWindow = 7 | 30 | 90 | "all";

const dayOptions: { value: StatisticsWindow; label: string }[] = [
  { value: 7, label: "7 өдөр" },
  { value: 30, label: "30 өдөр" },
  { value: 90, label: "90 өдөр" },
  { value: "all", label: "All time" },
];

function money(value: number) {
  return new Intl.NumberFormat("mn-MN", {
    style: "currency",
    currency: "MNT",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function compact(value: number) {
  return new Intl.NumberFormat("mn-MN", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function trendText(value: number) {
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}

function metricValue(value: number, unit: string) {
  if (unit === "MNT") return money(value);
  if (unit === "%") return `${value}%`;
  return compact(value);
}

function windowLabel(value: StatisticsInsights["windowDays"]) {
  return value === "all" ? "All time" : `${value} өдөр`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function downloadBlob(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildReportHtml(data: StatisticsInsights) {
  const generatedAt = new Date(data.generatedAt).toLocaleString("mn-MN");
  const metricRows = data.marketingMetrics
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.label)}</td>
          <td>${escapeHtml(metricValue(item.value, item.unit))}</td>
          <td>${escapeHtml(item.unit)}</td>
          <td>${escapeHtml(trendText(item.trend))}</td>
          <td>${escapeHtml(item.description)}</td>
        </tr>`,
    )
    .join("");
  const productRows = data.topProducts
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.organizationName)}</td>
          <td>${item.units}</td>
          <td>${escapeHtml(money(item.revenue))}</td>
          <td>${item.transactions}</td>
        </tr>`,
    )
    .join("");
  const branchRows = data.topBranches
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.organizationName)}</td>
          <td>${item.orders}</td>
          <td>${escapeHtml(money(item.revenue))}</td>
          <td>${escapeHtml(money(item.avgTicket))}</td>
        </tr>`,
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; }
          h1 { font-size: 24px; }
          h2 { margin-top: 24px; font-size: 18px; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>MGL Store marketing statistics</h1>
        <p>Хугацаа: ${escapeHtml(windowLabel(data.windowDays))} · Үүсгэсэн: ${escapeHtml(generatedAt)}</p>
        <h2>Marketing KPI</h2>
        <table>
          <thead>
            <tr>
              <th>Ангилал</th>
              <th>Үзүүлэлт</th>
              <th>Утга</th>
              <th>Нэгж</th>
              <th>Trend</th>
              <th>Тайлбар</th>
            </tr>
          </thead>
          <tbody>${metricRows}</tbody>
        </table>
        <h2>Top products</h2>
        <table>
          <thead>
            <tr><th>#</th><th>Бараа</th><th>Байгууллага</th><th>Нэгж</th><th>Орлого</th><th>Transactions</th></tr>
          </thead>
          <tbody>${productRows}</tbody>
        </table>
        <h2>Top branches</h2>
        <table>
          <thead>
            <tr><th>#</th><th>Салбар</th><th>Байгууллага</th><th>Хөдөлгөөн</th><th>Орлого</th><th>Дундаж сагс</th></tr>
          </thead>
          <tbody>${branchRows}</tbody>
        </table>
      </body>
    </html>`;
}

export default function StatisticsPage() {
  const [days, setDays] = useState<StatisticsWindow>(30);
  const [data, setData] = useState<StatisticsInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"all" | "products" | "branches">("all");
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);

  const load = async (nextDays = days) => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchStatisticsInsights(nextDays));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Статистик дата ачаалагдсангүй");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const branchChart = useMemo(
    () =>
      (data?.topBranches ?? []).slice(0, 6).map((item) => ({
        name: item.name.length > 12 ? `${item.name.slice(0, 12)}...` : item.name,
        revenue: item.revenue,
        orders: item.orders,
      })),
    [data],
  );

  const productChart = useMemo(
    () =>
      (data?.topProducts ?? []).slice(0, 7).map((item) => ({
        name: item.name.length > 14 ? `${item.name.slice(0, 14)}...` : item.name,
        units: item.units,
        revenue: item.revenue,
      })),
    [data],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    const items = data?.topProducts ?? [];
    if (!normalizedQuery) return items;
    return items.filter((item) =>
      [item.name, item.sku ?? "", item.organizationName]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [data, normalizedQuery]);

  const filteredBranches = useMemo(() => {
    const items = data?.topBranches ?? [];
    if (!normalizedQuery) return items;
    return items.filter((item) =>
      [item.name, item.address, item.organizationName]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [data, normalizedQuery]);

  const statusRows = useMemo(() => {
    const total = (data?.orderStatus ?? []).reduce((sum, item) => sum + item.count, 0);
    return (data?.orderStatus ?? []).map((item) => ({
      ...item,
      percent: total > 0 ? Math.round((item.count / total) * 100) : 0,
    }));
  }, [data]);

  const metricGroups = useMemo(() => {
    const groups = new Map<string, StatisticsInsights["marketingMetrics"]>();
    for (const item of data?.marketingMetrics ?? []) {
      groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
    }
    return Array.from(groups.entries());
  }, [data]);

  const selectedMetric = useMemo(() => {
    const metrics = data?.marketingMetrics ?? [];
    return metrics.find((item) => item.id === selectedMetricId) ?? metrics[0] ?? null;
  }, [data, selectedMetricId]);

  const selectedMetricChart = useMemo(() => {
    if (!selectedMetric) return [];
    if (data?.windowDays === "all" || selectedMetric.trend === 0) {
      return [{ name: windowLabel(data?.windowDays ?? "all"), value: selectedMetric.value }];
    }

    const previousValue = Math.max(0, Math.round(selectedMetric.value / (1 + selectedMetric.trend / 100)));
    return [
      { name: "Өмнөх", value: previousValue },
      { name: "Одоогийн", value: selectedMetric.value },
    ];
  }, [data?.windowDays, selectedMetric]);

  const exportExcel = () => {
    if (!data) return;
    downloadBlob(
      `mgl-store-statistics-${data.windowDays === "all" ? "all-time" : `${data.windowDays}d`}.xls`,
      "application/vnd.ms-excel;charset=utf-8",
      buildReportHtml(data),
    );
  };

  const exportWord = () => {
    if (!data) return;
    downloadBlob(
      `mgl-store-statistics-${data.windowDays === "all" ? "all-time" : `${data.windowDays}d`}.doc`,
      "application/msword;charset=utf-8",
      buildReportHtml(data),
    );
  };

  const heroCards = data
    ? [
        {
          label: "Нэвтэрсэн хэрэглэгч",
          value: compact(data.hero.activeUsers),
          trend: trendText(data.hero.activeUsersTrend),
          icon: LogIn,
          tone: "bg-emerald-500",
        },
        {
          label: "Login session",
          value: compact(data.hero.loginSessions),
          trend: trendText(data.hero.loginSessionsTrend),
          icon: Activity,
          tone: "bg-sky-500",
        },
        {
          label: "Борлуулалтын орлого",
          value: money(data.hero.totalRevenue),
          trend: trendText(data.hero.revenueTrend),
          icon: WalletCards,
          tone: "bg-fuchsia-500",
        },
        {
          label: "Захиалга / POS",
          value: compact(data.hero.totalOrders),
          trend: trendText(data.hero.ordersTrend),
          icon: Boxes,
          tone: "bg-amber-500",
        },
      ]
    : [];

  return (
    <div className="space-y-5 pb-8">
      <section className="overflow-hidden rounded-2xl bg-slate-950 text-white">
        <div className="grid gap-6 p-5 md:grid-cols-[1.35fr_0.65fr] md:p-7">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-lime-200">
              <Sparkles className="h-4 w-4" />
              Live commerce pulse
            </div>
            <h2 className="mt-5 max-w-2xl text-3xl font-black tracking-tight md:text-5xl">
              MGL Store data room
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Нэвтрэлт, борлуулалт, хамгийн халуун бараа, салбарын эргэлтийг нэг дороос хурдан уншина.
            </p>
          </div>
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap gap-2">
              {dayOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDays(option.value)}
                  className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                    days === option.value ? "bg-lime-300 text-slate-950" : "bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => load()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-slate-950"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Шинэчлэх
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={exportExcel}
                disabled={!data}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-400 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </button>
              <button
                onClick={exportWord}
                disabled={!data}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-300 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText className="h-4 w-4" />
                Word
              </button>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Vendor, бараа, салбар, SKU хайх..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-lime-300 focus:bg-white focus:ring-2 focus:ring-lime-100"
            />
          </div>
          <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 text-sm font-black text-slate-600">
            {[
              { key: "all", label: "Бүгд" },
              { key: "products", label: "Бараа" },
              { key: "branches", label: "Салбар" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setView(item.key as typeof view)}
                className={`rounded-lg px-4 py-2 transition ${
                  view === item.key ? "bg-white text-slate-950 shadow-sm" : "hover:text-slate-950"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !data
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-2xl bg-white" />
            ))
          : heroCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.tone} text-white`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    {card.trend}
                  </span>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-slate-500">{card.label}</p>
                <p className="mt-1 truncate text-2xl font-black text-slate-950">{card.value}</p>
              </div>
            ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
              <h3 className="flex items-center gap-2 text-lg font-black text-slate-950">
                <Target className="h-5 w-5 text-lime-500" />
                Marketing insight metrics
              </h3>
            <p className="text-sm font-medium text-slate-500">
              Audience, acquisition, revenue, conversion, demand, coverage
            </p>
          </div>
          <button
            onClick={exportExcel}
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
                      onClick={() => setSelectedMetricId(item.id)}
                      className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                        selectedMetric?.id === item.id
                          ? "border-lime-300 bg-lime-50 ring-2 ring-lime-100"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-black uppercase text-slate-500">{item.label}</p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black ${
                            item.trend > 0
                              ? "bg-emerald-100 text-emerald-700"
                              : item.trend < 0
                                ? "bg-red-100 text-red-700"
                                : "bg-white text-slate-500"
                          }`}
                        >
                          {trendText(item.trend)}
                        </span>
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

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-950">Салбарын эргэлт</h3>
              <p className="text-sm font-medium text-slate-500">Орлогоор тэргүүлж буй салбарууд</p>
            </div>
            <Store className="h-5 w-5 text-slate-400" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={compact} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="revenue" fill="#84cc16" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-950">Хамгийн их зарагдаж буй бараа</h3>
              <p className="text-sm font-medium text-slate-500">Хамгийн их зарагдсан бараа</p>
            </div>
            <Flame className="h-5 w-5 text-orange-500" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={productChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="units" stroke="#0ea5e9" fill="#bae6fd" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-950">
            <Trophy className="h-5 w-5 text-amber-500" />
            Хамгийн их зарагдаж буй бараа
          </h3>
          <div className="space-y-3">
            {filteredProducts.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                Хайлтад тохирох бараа олдсонгүй.
              </p>
            )}
            {filteredProducts.slice(0, view === "branches" ? 4 : 8).map((item, index) => (
              <div key={item.productId} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-white">
                  {index + 1}
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-950">{item.name}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">{item.organizationName || item.sku || "MGL Store"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-950">{item.units} ш</p>
                  <p className="text-xs font-bold text-emerald-600">{money(item.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-950">
            <Store className="h-5 w-5 text-sky-500" />
            Branch leaderboard
          </h3>
          <div className="space-y-3">
            {filteredBranches.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                Хайлтад тохирох салбар олдсонгүй.
              </p>
            )}
            {filteredBranches.slice(0, view === "products" ? 4 : 8).map((item, index) => (
              <div key={item.branchId} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      #{index + 1} {item.name}
                    </p>
                    <p className="truncate text-xs font-semibold text-slate-500">{item.organizationName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-950">{money(item.revenue)}</p>
                    <p className="text-xs font-bold text-slate-500">{item.orders} хөдөлгөөн</p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-sky-400"
                    style={{
                      width: `${Math.min(100, Math.max(8, (item.revenue / Math.max(data?.topBranches[0]?.revenue ?? 1, 1)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-black text-slate-950">Order status mix</h3>
          <div className="space-y-3">
            {statusRows.map((item) => (
              <div key={item.status}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-black text-slate-700">{item.status}</span>
                  <span className="font-bold text-slate-500">
                    {item.count} · {item.percent}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-lime-400"
                    style={{ width: `${Math.max(4, item.percent)}%` }}
                  />
                </div>
              </div>
            ))}
            {statusRows.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                Энэ хугацаанд захиалгын төлөв бүртгэгдээгүй байна.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-black text-slate-950">Recent POS sales</h3>
          <div className="space-y-3">
            {(data?.recentSales ?? []).slice(0, 8).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">{sale.receiptNo}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {sale.organizationName} · {sale.branchName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-950">{money(sale.total)}</p>
                  <p className="text-xs font-bold text-slate-500">
                    {new Date(sale.createdAt).toLocaleDateString("mn-MN")}
                  </p>
                </div>
              </div>
            ))}
            {(data?.recentSales ?? []).length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                POS борлуулалтын шинэ бичлэг алга.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
