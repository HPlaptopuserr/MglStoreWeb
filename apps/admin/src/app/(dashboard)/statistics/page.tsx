"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  Flame,
  RefreshCw,
  Search,
  Sparkles,
  Store,
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
import { BranchLeaderboard } from "./_components/BranchLeaderboard";
import { StatisticsHeroCards } from "./_components/StatisticsHeroCards";
import { StatisticsMetricPanel } from "./_components/StatisticsMetricPanel";
import { TopProductsList } from "./_components/TopProductsList";
import {
  compact,
  dayOptions,
  metricValue,
  money,
  trendText,
  windowLabel,
  type StatisticsWindow,
} from "./_components/statistics-format";

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
          <td>${escapeHtml(item.sku ?? "")}</td>
          <td>${item.units}</td>
          <td>${escapeHtml(money(item.revenue))}</td>
          <td>${item.transactions}</td>
          <td>${item.stock}</td>
          <td>${item.velocityScore}</td>
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
          <td>${escapeHtml(item.address)}</td>
          <td>${item.orders}</td>
          <td>${item.posSales}</td>
          <td>${item.onlineOrders}</td>
          <td>${escapeHtml(money(item.revenue))}</td>
          <td>${escapeHtml(money(item.avgTicket))}</td>
          <td>${item.sharePercent}%</td>
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
            <tr><th>#</th><th>Бараа</th><th>Байгууллага</th><th>SKU</th><th>Нэгж</th><th>Орлого</th><th>Transactions</th><th>Үлдэгдэл</th><th>Velocity</th></tr>
          </thead>
          <tbody>${productRows}</tbody>
        </table>
        <h2>Top branches</h2>
        <table>
          <thead>
            <tr><th>#</th><th>Салбар</th><th>Байгууллага</th><th>Хаяг</th><th>Нийт хөдөлгөөн</th><th>POS</th><th>Online</th><th>Орлого</th><th>Дундаж сагс</th><th>Эзлэх хувь</th></tr>
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

      <StatisticsHeroCards data={data} loading={loading} />

      <StatisticsMetricPanel
        data={data}
        loading={loading}
        metricGroups={metricGroups}
        selectedMetric={selectedMetric}
        selectedMetricId={selectedMetricId}
        onMetricSelect={setSelectedMetricId}
        onExport={exportExcel}
      />

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
        <TopProductsList
          products={filteredProducts}
          visibleCount={view === "branches" ? 4 : 8}
        />
        <BranchLeaderboard
          branches={filteredBranches}
          maxRevenue={data?.topBranches[0]?.revenue ?? 0}
          visibleCount={view === "products" ? 4 : 8}
        />
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
