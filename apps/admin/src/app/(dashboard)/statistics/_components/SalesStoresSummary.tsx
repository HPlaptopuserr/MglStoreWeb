"use client";
import { API } from "@/lib/api";
import { useAdminResource } from "@/lib/use-admin-resource";
import type { SalesStoreSummary } from "@/lib/admin-sales-stores-api";
import {
  SalesStoreSummaryCards,
  SalesStoreSummaryHeading,
} from "./SalesStoreSummaryCards";
export function SalesStoresSummary({ days }: { days: number | "all" }) {
  const { data, error, loading, reload } = useAdminResource<SalesStoreSummary>(
    `${API}/admin/statistics/stores/summary?days=${days}`,
  );
  return (
    <section
      aria-labelledby="store-summary-heading"
      className="space-y-3"
    >
      <SalesStoreSummaryHeading />
      <div aria-live="polite" aria-busy={loading}>
        {loading && (
          <p
            role="status"
            className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500"
          >
            Дэлгүүрийн тоон мэдээллийг ачааллаж байна…
          </p>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
            <button
              type="button"
              onClick={reload}
              className="ml-2 font-bold underline"
            >
              Дахин оролдох
            </button>
          </div>
        )}
        {data && <SalesStoreSummaryCards data={data} days={days} />}
      </div>
    </section>
  );
}
