"use client";
import { useState } from "react";
import type { AdminSalesStore } from "@/lib/admin-sales-stores-api";
import { SalesStoreRegistration } from "./SalesStoreRegistration";
import { SalesStoreProfile } from "./SalesStoreProfile";
import { SalesStoreBranches } from "./SalesStoreBranches";
import { useAdminResource } from "@/lib/use-admin-resource";
import { API } from "@/lib/api";
import type { SalesStoreDetailsResponse } from "@/lib/admin-sales-stores-api";
export function SalesStoreDetails({ store }: { store: AdminSalesStore }) {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } =
    useAdminResource<SalesStoreDetailsResponse>(
      `${API}/admin/statistics/stores/${encodeURIComponent(store.id)}?page=${page}`,
    );
  return (
    <div className="space-y-6 border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
      <SalesStoreRegistration store={store} />
      <div aria-live="polite" aria-busy={loading} className="space-y-6">
        {loading && (
          <p role="status" className="text-sm text-slate-500">
            Дэлгэрэнгүй мэдээллийг ачааллаж байна…
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
        {data && (
          <>
            <SalesStoreProfile details={data} />
            <SalesStoreBranches branches={data.branches} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
