"use client";

import { useState } from "react";
import type { PosReceipt } from "@mgl/types";
import type { SalesReportView } from "../utils/export-daily-sales";
import { SalesHistoryActions } from "./SalesHistoryActions";
import { salesDay } from "../utils/sales-history-filters";

interface Props {
  range: { start: string; end: string };
  onRangeChange: (range: { start: string; end: string }) => void;
  cashier: string;
  onCashierChange: (cashier: string) => void;
  employees: { id: string; name: string }[];
  receipts: PosReceipt[];
  loading: boolean;
  demo: boolean;
  onDemoChange: (demo: boolean) => void;
  view?: SalesReportView;
  onViewChange?: (view: SalesReportView) => void;
  onRefresh?: () => void;
  showActions?: boolean;
}
export function DailySalesExport({
  range,
  onRangeChange,
  cashier,
  onCashierChange,
  employees,
  receipts,
  loading,
  demo,
  onDemoChange,
  view,
  onViewChange,
  onRefresh,
  showActions = true,
}: Props) {
  const [referenceTime] = useState(() => Date.now());
  const invalidRange = Boolean(
    range.start && range.end && range.start > range.end,
  );
  const fieldClass =
    "min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:outline-blue-600";
  return (
    <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-5 py-3">
      <div
        className="mb-3 flex flex-wrap gap-2"
        aria-label="Хугацааны хурдан сонголт"
      >
        {[
          { label: "Өнөөдөр", days: 1 },
          { label: "Сүүлийн 7 хоног", days: 7 },
          { label: "Бүх өдөр", days: 0 },
        ].map(({ label, days }) => {
          const today = salesDay(new Date(referenceTime).toISOString());
          const start = days
            ? salesDay(
                new Date(referenceTime - (days - 1) * 86400000).toISOString(),
              )
            : "";
          const end = days ? today : "";
          const active = range.start === start && range.end === end;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={active}
              onClick={() => {
                onRangeChange({ start, end });
              }}
              className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-blue-600 ${active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-slate-600">
          Эхлэх огноо
          <input
            type="date"
            value={range.start}
            max={range.end || undefined}
            aria-invalid={invalidRange}
            aria-describedby={invalidRange ? "sales-range-error" : undefined}
            onChange={(event) => {
              onRangeChange({ ...range, start: event.target.value });
            }}
            className={`${fieldClass} w-full min-w-0`}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-slate-600">
          Дуусах огноо
          <input
            type="date"
            value={range.end}
            min={range.start || undefined}
            aria-invalid={invalidRange}
            aria-describedby={invalidRange ? "sales-range-error" : undefined}
            onChange={(event) => {
              onRangeChange({ ...range, end: event.target.value });
            }}
            className={`${fieldClass} w-full min-w-0`}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-slate-600">
          Ажилтан
          <select
            aria-label="Ажилтан"
            value={cashier}
            onChange={(e) => {
              onCashierChange(e.target.value);
            }}
            className={`${fieldClass} w-full min-w-0`}
          >
            <option value="">Бүх ажилтан</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </label>
        {process.env.NODE_ENV !== "production" && !onViewChange && (
          <label className="flex min-h-10 items-center gap-2 text-xs font-semibold text-amber-800">
            <input
              type="checkbox"
              checked={demo}
              onChange={(e) => {
                onDemoChange(e.target.checked);
              }}
            />
            Тест өгөгдөл
          </label>
        )}
      </div>
      {invalidRange && (
        <p
          id="sales-range-error"
          role="alert"
          className="mt-2 text-sm text-rose-700"
        >
          Эхлэх огноо дуусах огнооноос хойш байж болохгүй.
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500">
        {receipts.length} баримт · Улаанбаатарын цагаар · Excel нь шүүлтүүрийг
        дагана · Эхлэх, дуусах өдрийг бүтнээр хамруулна · Буцаалтыг оруулахгүй
      </p>
      {demo && (
        <p
          role="status"
          className="mt-2 rounded-lg bg-amber-100 p-2 text-xs text-amber-900"
        >
          ТЕСТ: 3 өдөр, 2 ажилтан, 6 баримт. Бодит борлуулалт, үлдэгдэлд
          нөлөөлөхгүй.
        </p>
      )}
      {showActions && (
        <div className="mt-4">
          <SalesHistoryActions
            range={range}
            cashier={cashier}
            employees={employees}
            receipts={receipts}
            loading={loading}
            demo={demo}
            view={view}
            onViewChange={onViewChange}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  );
}
