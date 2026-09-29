"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { PosReceipt } from "@mgl/types";
import { exportDailySales } from "../utils/export-daily-sales";
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
}: Props) {
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const invalidRange = Boolean(
    range.start && range.end && range.start > range.end,
  );
  const period =
    !range.start && !range.end
      ? "all-days"
      : `${range.start || "beginning"}_${range.end || "latest"}`;
  async function download() {
    if (loading || exporting || invalidRange) return;
    setExporting(true);
    setMessage("");
    try {
      await exportDailySales(
        receipts,
        `${demo ? "TEST-" : ""}${period}${cashier ? "-employee" : ""}`,
      );
      setMessage("Excel файл татагдлаа.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Excel татахад алдаа гарлаа.",
      );
    } finally {
      setExporting(false);
    }
  }
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
          const today = salesDay(new Date().toISOString());
          const start = days
            ? salesDay(
                new Date(Date.now() - (days - 1) * 86400000).toISOString(),
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
                setMessage("");
              }}
              className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-blue-600 ${active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              setMessage("");
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
              setMessage("");
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
              setMessage("");
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
        <button
          type="button"
          onClick={download}
          disabled={
            invalidRange ||
            loading ||
            exporting ||
            !receipts.some(
              (receipt) =>
                receipt.status === "COMPLETED" && receipt.lines.length > 0,
            )
          }
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          {exporting ? "Бэлтгэж байна…" : "Excel татах"}
        </button>
        {process.env.NODE_ENV !== "production" && (
          <label className="flex min-h-10 items-center gap-2 text-xs font-semibold text-amber-800">
            <input
              type="checkbox"
              checked={demo}
              onChange={(e) => {
                onDemoChange(e.target.checked);
                setMessage("");
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
      {message && (
        <p role="status" className="mt-2 text-sm text-slate-700">
          {message}
        </p>
      )}
    </div>
  );
}
