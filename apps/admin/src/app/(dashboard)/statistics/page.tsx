"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  Gift,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import {
  fetchStatisticsInsights,
  type StatisticsInsights,
} from "@/lib/statistics-api";
import { useAdminAuth } from "@/lib/admin-auth";
import { BranchLeaderboard } from "./_components/BranchLeaderboard";
import { StatisticsHeroCards } from "./_components/StatisticsHeroCards";
import { StatisticsMetricPanel } from "./_components/StatisticsMetricPanel";
import { StatisticsRankingCharts } from "./_components/StatisticsRankingCharts";
import { SystemFinancialOverview } from "./_components/SystemFinancialOverview";
import { TopProductsList } from "./_components/TopProductsList";
import {
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
          <td>${escapeHtml(item.scope)}</td>
          <td>${escapeHtml(item.source)}</td>
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
              <th>Хамрах хүрээ</th>
              <th>Эх үүсвэр</th>
              <th>Тайлбар</th>
            </tr>
          </thead>
          <tbody>${metricRows}</tbody>
        </table>
        <h2>Top products</h2>
        <table>
          <thead>
            <tr><th>#</th><th>Бараа</th><th>Байгууллага</th><th>SKU</th><th>Нэгж</th><th>Борлуулалт</th><th>Transactions</th><th>Үлдэгдэл</th></tr>
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
  const { authFetch } = useAdminAuth();
  const [days, setDays] = useState<StatisticsWindow>(30);
  const [data, setData] = useState<StatisticsInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"all" | "products" | "branches">("all");
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [loyaltyDetail, setLoyaltyDetail] = useState<"all" | "earn" | "redeem">(
    "all",
  );

  const load = async (nextDays = days) => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchStatisticsInsights(nextDays, authFetch));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Статистик дата ачаалагдсангүй",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, authFetch]);

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
    const total = (data?.orderStatus ?? []).reduce(
      (sum, item) => sum + item.count,
      0,
    );
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

  const loyaltyRows = useMemo(() => {
    const items = data?.loyalty?.recent ?? [];
    if (loyaltyDetail === "earn")
      return items.filter((item) => item.action === "EARN");
    if (loyaltyDetail === "redeem")
      return items.filter((item) => item.action === "SPEND");
    return items;
  }, [data, loyaltyDetail]);

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
              Нэвтрэлт, борлуулалт, хамгийн халуун бараа, салбарын эргэлтийг нэг
              дороос хурдан уншина.
            </p>
          </div>
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap gap-2">
              {dayOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDays(option.value)}
                  className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                    days === option.value
                      ? "bg-lime-300 text-slate-950"
                      : "bg-white/10 text-white hover:bg-white/15"
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
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
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
                  view === item.key
                    ? "bg-white text-slate-950 shadow-sm"
                    : "hover:text-slate-950"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <StatisticsHeroCards data={data} loading={loading} />
      <SystemFinancialOverview
        overview={data?.financialOverview ?? null}
        loading={loading}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black text-slate-950">
              <Gift className="h-5 w-5 text-amber-500" />
              POS M Point бүртгэл
            </h3>
            <p className="text-sm font-medium text-slate-500">
              Оноо олголт, оноо хасалт болон тухайн receipt-ийн дэлгэрэнгүй
              хөдөлгөөн.
            </p>
          </div>
          <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 text-xs font-black text-slate-600">
            {[
              { key: "all", label: "Бүгд" },
              { key: "earn", label: "Олголт" },
              { key: "redeem", label: "Хасалт" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setLoyaltyDetail(item.key as typeof loyaltyDetail)
                }
                className={`rounded-lg px-4 py-2 transition ${
                  loyaltyDetail === item.key
                    ? "bg-white text-slate-950 shadow-sm"
                    : "hover:text-slate-950"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            {
              key: "all",
              label: "Нийт хөдөлгөөн",
              value: data?.loyalty?.transactions ?? 0,
              sub: `${data?.loyalty?.earnTransactions ?? 0} олголт · ${data?.loyalty?.redeemTransactions ?? 0} хасалт`,
            },
            {
              key: "earn",
              label: "Олгосон M Point",
              value: `${(data?.loyalty?.earnedPoints ?? 0).toLocaleString("mn-MN")} M`,
              sub: "POS худалдан авалтын буцаан олголт",
            },
            {
              key: "redeem",
              label: "Хасуулсан M Point",
              value: `${(data?.loyalty?.redeemedPoints ?? 0).toLocaleString("mn-MN")} M`,
              sub: "Төлбөрөөс оноогоор хассан дүн",
            },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setLoyaltyDetail(item.key as typeof loyaltyDetail)}
              className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                loyaltyDetail === item.key
                  ? "border-amber-300 bg-amber-50 ring-2 ring-amber-100"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <p className="text-xs font-black uppercase text-slate-500">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {item.value}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {item.sub}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[1.1fr_0.9fr_0.8fr_0.8fr_0.8fr] bg-slate-50 px-4 py-3 text-xs font-black uppercase text-slate-500">
            <span>Receipt / хэрэглэгч</span>
            <span>Байгууллага</span>
            <span>Төрөл</span>
            <span className="text-right">Борлуулалт</span>
            <span className="text-right">M Point</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loyaltyRows.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1.1fr_0.9fr_0.8fr_0.8fr_0.8fr] items-center gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">
                    {item.receiptNo}
                  </p>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {item.customerName || item.customerPhone} ·{" "}
                    {new Date(item.createdAt).toLocaleString("mn-MN")}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-700">
                    {item.organizationName}
                  </p>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {item.branchName}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-black ${
                    item.action === "EARN"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {item.action === "EARN" ? "Олголт" : "Хасалт"}
                </span>
                <p className="text-right font-black text-slate-950">
                  {money(item.saleTotal)}
                </p>
                <p className="text-right font-black text-slate-950">
                  {item.action === "EARN"
                    ? `+${item.earnedPoints.toLocaleString("mn-MN")} M`
                    : `-${item.redeemedPoints.toLocaleString("mn-MN")} M`}
                </p>
              </div>
            ))}
            {loyaltyRows.length === 0 && (
              <p className="p-4 text-sm font-bold text-slate-500">
                Сонгосон хугацаанд M Point хөдөлгөөн бүртгэгдээгүй байна.
              </p>
            )}
          </div>
        </div>
      </section>

      <StatisticsMetricPanel
        data={data}
        loading={loading}
        metricGroups={metricGroups}
        selectedMetricId={selectedMetricId}
        onMetricSelect={(metricId) =>
          setSelectedMetricId((current) =>
            current === metricId ? null : metricId,
          )
        }
        onExport={exportExcel}
      />

      <StatisticsRankingCharts
        branches={data?.topBranches ?? []}
        products={data?.topProducts ?? []}
        windowDays={data?.windowDays ?? days}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <TopProductsList
          products={filteredProducts}
          visibleCount={view === "branches" ? 4 : 8}
        />
        <BranchLeaderboard
          branches={filteredBranches}
          maxRevenue={data?.topBranches[0]?.revenue ?? 0}
          visibleCount={view === "products" ? 4 : 8}
          windowDays={data?.windowDays ?? days}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-black text-slate-950">
            Order status mix
          </h3>
          <div className="space-y-3">
            {statusRows.map((item) => (
              <div key={item.status}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-black text-slate-700">
                    {item.status}
                  </span>
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
          <h3 className="mb-4 text-lg font-black text-slate-950">
            Recent POS sales
          </h3>
          <div className="space-y-3">
            {(data?.recentSales ?? []).slice(0, 8).map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">
                    {sale.receiptNo}
                  </p>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {sale.organizationName} · {sale.branchName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-950">
                    {money(sale.total)}
                  </p>
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
