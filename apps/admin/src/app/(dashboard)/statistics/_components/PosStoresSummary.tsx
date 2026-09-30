"use client";
import { StatisticsSummaryCard } from "./StatisticsSummaryCard";

import { Store, Package, Layers3, RefreshCw } from "lucide-react";
import { API } from "@/lib/api";
import { useAdminResource } from "@/lib/use-admin-resource";
import { windowLabel, type StatisticsWindow } from "./statistics-format";

interface PosStoreSummary {
  activeStoreCount: number;
  productRecordCount: number;
  productTypeCount: number;
  windowDays: StatisticsWindow;
  generatedAt: string;
}

export function PosStoresSummary({ days }: { days: StatisticsWindow }) {
  const { data, loading, error, reload } = useAdminResource<PosStoreSummary>(
    `${API}/admin/statistics/pos-stores/summary?days=${days}`,
  );
  const metrics = data ? [
    { label: "POS-оор борлуулалт хийсэн дэлгүүр", value: data.activeStoreCount, icon: Store, tone: "bg-emerald-500", description: "Байгууллага бүрийг нэг удаа тоолно" },
    { label: "Барааны нэр төрөл", value: data.productTypeCount, href: "/master-products", icon: Package, tone: "bg-sky-500", description: "Нэгдсэн сангийн холбоосоор давхардал хассан" },
    { label: "Дэлгүүрүүдийн барааны бүртгэл", value: data.productRecordCount, icon: Layers3, tone: "bg-amber-500", description: "Идэвхтэй барааны бүртгэлийн нийлбэр" },
  ] : [];

  return <section aria-labelledby="pos-stores-heading" className="space-y-3">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 id="pos-stores-heading" className="text-lg font-extrabold text-slate-900">POS / Касс ашиглаж буй дэлгүүрүүд</h2>
        <p className="mt-1 text-sm text-slate-500">{windowLabel(days)} · Амжилттай борлуулалт хийсэн дэлгүүрүүд</p>
      </div>
      <button type="button" onClick={reload} disabled={loading} aria-label="POS статистик шинэчлэх" className="rounded-xl border border-slate-200 p-2.5 text-slate-600 motion-safe:transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50"><RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? "motion-safe:animate-spin" : ""}`} /></button>
    </div>
    <div aria-live="polite" aria-busy={loading}>
      {loading && <p role="status" className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">POS статистик ачааллаж байна…</p>}
      {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" onClick={reload} className="ml-2 font-semibold underline">Дахин оролдох</button></div>}
      {data && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(metric => <StatisticsSummaryCard key={metric.label} label={metric.label} value={metric.value.toLocaleString("mn-MN")} note={metric.description} icon={metric.icon} tone={metric.tone} href={metric.href} />)}</div>
        {data.activeStoreCount === 0 && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Сонгосон хугацаанд POS-оор амжилттай борлуулалт хийсэн дэлгүүр алга.</p>}
        <details className="mt-3 text-xs leading-5 text-slate-500"><summary className="w-fit cursor-pointer rounded font-semibold hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-600">Тооцох аргачлал</summary><p className="mt-2 max-w-3xl">Цуцалсан, буцаасан борлуулалт болон устгасан байгууллагыг хасна. Байгууллага бүрийг нэг тоолно. Барааны тоо нь одоогийн идэвхтэй бүртгэлээр тооцогдоно. Нэгдсэн сангийн ижил барааг нэг төрөлд, холбоогүй барааг тус бүрээр тоолно. Үлдэгдлийн ширхэгийн тоо биш.</p></details>
      </>}
    </div>
  </section>;
}
