"use client";

import { useMemo } from "react";
import { useSalesHistory } from "@/features/pos/hooks/useSalesHistory";
import { DailySalesExport } from "@/features/pos/components/DailySalesExport";
import { SoldProductsList } from "@/features/pos/components/SoldProductsList";

interface Props {
  branchId: string;
  range: { start: string; end: string };
  onRangeChange: (range: { start: string; end: string }) => void;
}
export function SalesReportPanel({ branchId, range, onRangeChange }: Props) {
  const history = useSalesHistory(branchId, range);
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
        demo={history.demo}
        onDemoChange={history.setDemo}
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={history.refresh}
          disabled={history.loading}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 focus-visible:outline-blue-600 disabled:opacity-50"
        >
          Шинэчлэх
        </button>
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
      ) : (
        <div className="flex max-h-[640px] flex-col overflow-hidden">
          <SoldProductsList receipts={completed} />
        </div>
      )}
    </div>
  );
}
