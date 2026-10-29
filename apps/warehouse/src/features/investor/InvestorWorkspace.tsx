"use client";
import { useCallback, useState } from "react";
import { Banknote, Eye, Loader2, RefreshCw } from "lucide-react";
import { useWarehouseScope } from "@/features/warehouse-scope/WarehouseScopeProvider";
import { useInvestorReport } from "./useInvestorReport";
import { InvestorReportFilters } from "./InvestorReportFilters";
import { MonthlyDividendCard } from "./MonthlyDividendCard";
import { InvestorMetrics } from "./InvestorMetrics";
import { InvestorTables } from "./InvestorTables";
import { WarehouseInvestorManager } from "./WarehouseInvestorManager";
import { WarehouseDividendDialog } from "./WarehouseDividendDialog";
import { InvestmentTopUpApprovals } from "./top-ups/InvestmentTopUpApprovals";

export function InvestorWorkspace() {
  const scope = useWarehouseScope();
  const [dividendDialogOpen, setDividendDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    productPage: 1,
    salesPage: 1,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshReport = useCallback(() => setRefreshKey((key) => key + 1), []);
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Хөрөнгө оруулагчийн тайлан
          </p>
          <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">
            {scope.selectedWarehouse?.name}
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            {scope.selectedWarehouse?.address}
          </p>
        </div>
        {!scope.viewerOnly && (
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setDividendDialogOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Banknote className="size-4" />
            Ногдол ашиг хуваарилах
          </button>
        )}
        <button
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
          aria-label="Тайлан шинэчлэх"
          title="Тайлан шинэчлэх"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Шинэчлэх</span>
        </button>
      </div>
      {dividendDialogOpen && !scope.viewerOnly && scope.selectedWarehouse && (
        <WarehouseDividendDialog
          key={`dividend-dialog:${scope.selectedWarehouseId}`}
          warehouseId={scope.selectedWarehouseId}
          warehouseName={scope.selectedWarehouse.name}
          onClose={() => setDividendDialogOpen(false)}
          onSaved={refreshReport}
        />
      )}
      <InvestorReportFilters
        from={filters.from}
        to={filters.to}
        onDateChange={(key, value) =>
          setFilters((current) => ({ ...current, [key]: value, salesPage: 1 }))
        }
        onWarehouseChange={(id) => {
          scope.selectWarehouse(id);
          setFilters((current) => ({
            ...current,
            productPage: 1,
            salesPage: 1,
          }));
        }}
        onReset={() =>
          setFilters((current) => ({
            ...current,
            from: "",
            to: "",
            salesPage: 1,
          }))
        }
      />
      {!scope.viewerOnly && (
        <InvestmentTopUpApprovals
          key={`top-up-approvals:${scope.selectedWarehouseId}`}
          warehouseId={scope.selectedWarehouseId}
        />
      )}
      {!scope.viewerOnly && (
        <WarehouseInvestorManager
          warehouseId={scope.selectedWarehouseId}
          onInvestmentSaved={refreshReport}
        />
      )}
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
          {data.investment?.monthlyDividend && (
            <MonthlyDividendCard
              dividend={data.investment.monthlyDividend}
              aggregate={data.investment.scope === "WAREHOUSE"}
              warehouseId={scope.selectedWarehouseId}
              onConfirmed={refreshReport}
            />
          )}
          <InvestorMetrics data={data} />
          <details className="group rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs leading-6 text-slate-600">
            <summary className="cursor-pointer font-medium text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500">
              Тооцооллын тайлбар
              {data.inventory.missingCostCount > 0 ||
              data.sales.missingCostCount > 0
                ? " · Өртөг дутуу мэдээлэл байна"
                : ""}
            </summary>
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
          </details>
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
