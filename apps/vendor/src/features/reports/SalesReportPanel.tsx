"use client";

import { useMemo, useState } from "react";
import type { SalesReportView } from "@/features/pos/utils/export-daily-sales";
import { useSalesHistory } from "@/features/pos/hooks/useSalesHistory";
import { SalesHistoryActions } from "@/features/pos/components/SalesHistoryActions";
import { DailySalesExport } from "@/features/pos/components/DailySalesExport";
import { summarizeSoldProducts } from "@/features/pos/utils/sold-product-summary";
import { SalesFinancialSummary } from "./SalesFinancialSummary";
import { SalesReportTopProducts } from "./SalesReportTopProducts";
import { SoldProductSummaryList } from "./SoldProductSummaryList";
import { SoldProductsList } from "@/features/pos/components/SoldProductsList";

interface Props {
  branchId: string;
  demo: boolean;
  onDemoChange: (demo: boolean) => void;
  range: { start: string; end: string };
  onRangeChange: (range: { start: string; end: string }) => void;
}
export function SalesReportPanel({
  branchId,
  range,
  onRangeChange,
  demo,
  onDemoChange,
}: Props) {
  const [view, setView] = useState<SalesReportView>("summary");
  const history = useSalesHistory(branchId, range, demo);
  const completed = useMemo(
    () => history.receipts.filter((receipt) => receipt.status === "COMPLETED"),
    [history.receipts],
  );
  const summaries = useMemo(
    () => summarizeSoldProducts(completed),
    [completed],
  );
  return (
    <div
      className="mt-4 space-y-4 [--report-scroll-offset:15rem] sm:[--report-scroll-offset:12rem]"
      aria-busy={history.loading}
    >
      <DailySalesExport
        showActions={false}
        range={range}
        onRangeChange={onRangeChange}
        cashier={history.cashier}
        onCashierChange={history.setCashier}
        employees={history.employees}
        receipts={completed}
        loading={history.loading}
        demo={demo}
        onDemoChange={onDemoChange}
        view={view}
        onViewChange={setView}
        onRefresh={history.refresh}
      />
      {!history.loading && !history.error && completed.length > 0 && (
        <SalesReportTopProducts receipts={completed} />
      )}
      {!history.loading && !history.error && completed.length > 0 && (
        <SalesFinancialSummary rows={summaries} />
      )}
      <div className="sticky top-14 z-10 sm:top-16">
        <SalesHistoryActions
          range={range}
          cashier={history.cashier}
          employees={history.employees}
          receipts={history.error ? [] : completed}
          loading={history.loading}
          demo={demo}
          view={view}
          onViewChange={setView}
          onRefresh={history.refresh}
        />
      </div>
      {history.error ? (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
        >
          {history.error}
        </p>
      ) : history.loading ? (
        <p role="status" className="p-6 text-sm text-slate-500">
          Борлуулалт ачаалж байна…
        </p>
      ) : view === "summary" ? (
        <SoldProductSummaryList receipts={completed} />
      ) : (
        <SoldProductsList receipts={completed} showSummary={false} />
      )}
    </div>
  );
}
