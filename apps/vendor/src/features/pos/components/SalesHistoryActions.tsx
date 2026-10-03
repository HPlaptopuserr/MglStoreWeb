"use client";

import type { PosReceipt } from "@mgl/types";
import type { SalesReportView } from "../utils/export-daily-sales";
import { SalesReportActions } from "./SalesReportActions";

interface Props {
  range: { start: string; end: string };
  cashier: string;
  employees: { id: string; name: string }[];
  receipts: PosReceipt[];
  loading: boolean;
  demo: boolean;
  view?: SalesReportView;
  onViewChange?: (view: SalesReportView) => void;
  onRefresh?: () => void;
}

/** Keeps export scope consistent wherever the report toolbar is placed. */
export function SalesHistoryActions({
  range,
  cashier,
  employees,
  receipts,
  loading,
  demo,
  view,
  onViewChange,
  onRefresh,
}: Props) {
  const period =
    !range.start && !range.end
      ? "all-days"
      : `${range.start || "beginning"}_${range.end || "latest"}`;
  const invalidRange = Boolean(
    range.start && range.end && range.start > range.end,
  );
  return (
    <SalesReportActions
      key={JSON.stringify([range, cashier, demo])}
      receipts={receipts}
      context={{
        from: range.start,
        to: range.end,
        cashierName: employees.find((employee) => employee.id === cashier)
          ?.name,
        test: demo,
      }}
      period={`${demo ? "TEST-" : ""}${period}${cashier ? "-employee" : ""}`}
      disabled={loading || invalidRange}
      view={view}
      onViewChange={onViewChange}
      onRefresh={onRefresh}
    />
  );
}
