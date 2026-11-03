"use client";
import { useMemo, useState } from "react";
import { CalendarClock, Search, ShieldCheck } from "lucide-react";
import { ExpiryProductCard } from "./ExpiryProductCard";
import {
  expiryMoney,
  filterExpiryProducts,
  type ExpiryFilter,
  type ExpiryInsights,
  type ExpirySort,
} from "./expiry-insights";

const PAGE_SIZE = 8;
export function ExpiryInsightsPanel({
  insights,
}: {
  insights: ExpiryInsights;
}) {
  const [filter, setFilter] = useState<ExpiryFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ExpirySort>("risk");
  const [page, setPage] = useState(1);
  const rows = useMemo(
    () => filterExpiryProducts(insights.products, filter, search, sort),
    [insights.products, filter, search, sort],
  );
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const tabs: {
    value: ExpiryFilter;
    label: string;
    count: number;
    color: string;
  }[] = [
    {
      value: "all",
      label: "Бүх эрсдэлтэй",
      count: insights.totalAtRisk,
      color: "text-slate-900",
    },
    {
      value: "expired",
      label: "Хугацаа хэтэрсэн",
      count: insights.products.filter((p) => p.daysUntilExpiry < 0).length,
      color: "text-red-700",
    },
    {
      value: "urgent",
      label: "14 хоногт дуусах",
      count: insights.urgentCount,
      color: "text-amber-700",
    },
    {
      value: "stagnant",
      label: "30 хоног борлуулалтгүй",
      count: insights.stagnantCount,
      color: "text-indigo-700",
    },
  ];
  return (
    <section
      aria-label="Дуусах хугацааны эрсдэл"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
            <CalendarClock size={22} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Дуусах хугацааны хяналт
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Хугацаа, үлдэгдэл, сүүлийн 30 хоногийн борлуулалтаар эрэмбэлэв.
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">
            Эрсдэлтэй нөөцийн борлуулах дүн
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
            {expiryMoney(insights.riskValue)}
          </p>
        </div>
      </header>
      <div className="p-4 sm:p-6">
        <div
          role="group"
          aria-label="Эрсдэлийн шүүлтүүр"
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              aria-pressed={filter === tab.value}
              onClick={() => {
                setFilter(tab.value);
                setPage(1);
              }}
              className={`rounded-xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-indigo-600 motion-reduce:transition-none ${filter === tab.value ? "border-indigo-400 bg-indigo-50 shadow-sm" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"}`}
            >
              <span
                className={`block text-2xl font-bold tabular-nums ${tab.color}`}
              >
                {tab.count}
              </span>
              <span className="mt-1 block text-xs font-medium leading-5 text-slate-600">
                {tab.label}
              </span>
            </button>
          ))}
        </div>
        <div className="my-5 flex flex-col gap-3 sm:flex-row">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
            <Search
              size={17}
              className="shrink-0 text-slate-400"
              aria-hidden="true"
            />
            <input
              aria-label="Эрсдэлтэй бараа хайх"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Барааны нэр, код, агуулахаар хайх"
              className="min-w-0 w-full bg-transparent py-3 text-sm outline-none"
            />
          </label>
          <select
            aria-label="Эрэмбэлэх"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as ExpirySort);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 focus-visible:outline-indigo-600"
          >
            <option value="risk">Эрсдэл өндөр эхэнд</option>
            <option value="date">Дуусах хугацаа ойр эхэнд</option>
            <option value="value">Нөөцийн дүн их эхэнд</option>
          </select>
        </div>
        <p role="status" className="mb-3 text-xs text-slate-500">
          {tabs.find((tab) => tab.value === filter)?.label} · {rows.length} мөр
        </p>
        {rows.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {rows.slice(start, start + PAGE_SIZE).map((product) => (
              <ExpiryProductCard key={product.inventoryId} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
            <ShieldCheck className="mx-auto mb-3 text-emerald-600" size={28} />
            <p className="text-sm font-semibold text-slate-700">
              {search || filter !== "all"
                ? "Шүүлтүүрт тохирох бараа алга"
                : "Одоогоор эрсдэлтэй бараа алга"}
            </p>
            {(search || filter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                  setPage(1);
                }}
                className="mt-3 rounded px-2 py-1 text-sm font-bold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-indigo-600"
              >
                Шүүлтүүр цэвэрлэх
              </button>
            )}
          </div>
        )}
        {pages > 1 && (
          <nav
            aria-label="Эрсдэлтэй барааны хуудсууд"
            className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm"
          >
            <span className="text-slate-500">
              {start + 1}–{Math.min(start + PAGE_SIZE, rows.length)} /{" "}
              {rows.length}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
                className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 disabled:opacity-40"
              >
                Өмнөх
              </button>
              <span>
                {currentPage} / {pages}
              </span>
              <button
                type="button"
                disabled={currentPage === pages}
                onClick={() => setPage(currentPage + 1)}
                className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 disabled:opacity-40"
              >
                Дараах
              </button>
            </div>
          </nav>
        )}
      </div>
    </section>
  );
}
