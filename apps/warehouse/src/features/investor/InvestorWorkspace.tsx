"use client";
import Link from "next/link";
import { useState } from "react";
import { Eye, Loader2, RefreshCw } from "lucide-react";
import { useWarehouseScope } from "@/features/warehouse-scope/WarehouseScopeProvider";
import { useInvestorReport } from "./useInvestorReport";
import { InvestorMetrics } from "./InvestorMetrics";
import { InvestorTables } from "./InvestorTables";

export function InvestorWorkspace() {
  const scope = useWarehouseScope();
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    productPage: 1,
    salesPage: 1,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useInvestorReport(
    scope.selectedWarehouseId,
    filters,
    refreshKey,
  );
  if (!scope.selectedWarehouseId)
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <Eye className="mx-auto mb-4 size-10 text-blue-400" />
        <h1 className="text-xl font-bold">Харах эрхтэй дэлгүүр алга</h1>
        <p className="mt-3 text-sm text-slate-500">
          Админ таны бүртгэлтэй утасны дугаараар дэлгүүрийн харах эрх нэмсний
          дараа тайлан энд харагдана.
        </p>
        <button
          onClick={() => void scope.refreshWarehouses()}
          className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Эрхээ дахин шалгах
        </button>
      </div>
    );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Хөрөнгө оруулагчийн тайлан
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {scope.selectedWarehouse?.name}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {scope.selectedWarehouse?.address}
          </p>
        </div>
        {!scope.viewerOnly && (
          <Link
            href="/viewers"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Хэрэглэгч нэмэх
          </Link>
        )}
        <button
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Шинэчлэх
        </button>
      </div>
      <div className="grid grid-cols-1 items-end gap-4 rounded-2xl sm:grid-cols-2 lg:grid-cols-[minmax(200px,1fr)_180px_180px_auto] border border-slate-200 bg-white p-4 shadow-sm">
        <label className="min-w-0 text-xs font-medium text-slate-500">
          Дэлгүүр
          <select
            value={scope.selectedWarehouseId}
            onChange={(event) => {
              scope.selectWarehouse(event.target.value);
              setFilters((current) => ({
                ...current,
                productPage: 1,
                salesPage: 1,
              }));
            }}
            className="mt-2 block w-full min-w-0 rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
          >
            {scope.warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </label>
        {(
          [
            { key: "from", label: "Эхлэх огноо" },
            { key: "to", label: "Дуусах огноо" },
          ] as const
        ).map(({ key, label }) => (
          <label
            key={key}
            className="min-w-0 text-xs font-medium text-slate-500"
          >
            {label}
            <input
              type="date"
              value={filters[key]}
              max={key === "from" ? filters.to || undefined : undefined}
              min={key === "to" ? filters.from || undefined : undefined}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  [key]: event.target.value,
                  salesPage: 1,
                }))
              }
              className="mt-2 block w-full min-w-0 rounded-lg border border-slate-200 p-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
          </label>
        ))}
        <button
          onClick={() =>
            setFilters((current) => ({
              ...current,
              from: "",
              to: "",
              salesPage: 1,
            }))
          }
          className="rounded-lg px-3 py-2.5 text-sm text-blue-600 transition hover:bg-blue-50"
        >
          Бүх хугацаа
        </button>
      </div>
      {loading && (
        <div
          role="status"
          className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-16 text-slate-500"
        >
          <Loader2 className="size-6 animate-spin text-blue-500" />
          Тайланг ачаалж байна…
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"
        >
          <p>{error}</p>
          <button
            onClick={() => setRefreshKey((key) => key + 1)}
            className="mt-3 font-semibold underline"
          >
            Дахин оролдох
          </button>
        </div>
      )}
      {data && !loading && !error && (
        <>
          <InvestorMetrics data={data} />
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs leading-6 text-slate-600">
            <p>
              Нийт ашиг = борлуулалт − борлуулсан барааны хадгалсан өртөг. Үйл
              ажиллагааны зардал, татвар, буцаалт болон хэсэгчилсэн төлөлтийг
              энэ үзүүлэлтэд тооцоогүй. Огноо Улаанбаатарын цагаар.
            </p>
            {(data.inventory.missingCostCount > 0 ||
              data.sales.missingCostCount > 0) && (
              <p className="mt-1 font-semibold text-amber-800">
                Өртөг дутуу: үлдэгдэлтэй {data.inventory.missingCostCount}{" "}
                бараа, {data.sales.missingCostCount} борлуулалт. Нийт өртөгт
                зөвхөн өртөг бүртгэлтэй дүнг оруулсан. Борлуулалтын өртөг дутуу
                бол нийт ашгийг харуулахгүй.
              </p>
            )}
          </div>
          <InvestorTables
            data={data}
            productPage={filters.productPage}
            salesPage={filters.salesPage}
            onProductPage={(productPage) =>
              setFilters((current) => ({ ...current, productPage }))
            }
            onSalesPage={(salesPage) =>
              setFilters((current) => ({ ...current, salesPage }))
            }
          />
        </>
      )}
    </div>
  );
}
