"use client";

import { useMemo, useState } from "react";
import type { SalesReportView } from "@/features/pos/utils/export-daily-sales";
import { useSalesHistory } from "@/features/pos/hooks/useSalesHistory";
import { DailySalesExport } from "@/features/pos/components/DailySalesExport";
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
  return (
    <div className="mt-4 space-y-4" aria-busy={history.loading}>
      <DailySalesExport
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
        <div className="flex max-h-[640px] flex-col overflow-hidden">
          <SoldProductsList receipts={completed} />
        </div>
      )}
    </div>
  );
}
