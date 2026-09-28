"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { PosReceipt } from "@mgl/types";
import { exportDailySales } from "../utils/export-daily-sales";
import { salesDay } from "../utils/sales-history-filters";

interface Props {
  date: string;
  onDateChange: (date: string) => void;
  cashier: string;
  onCashierChange: (cashier: string) => void;
  employees: { id: string; name: string }[];
  receipts: PosReceipt[];
  loading: boolean;
  demo: boolean;
  onDemoChange: (demo: boolean) => void;
}
export function DailySalesExport({
  date,
  onDateChange,
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
  async function download() {
    if (loading || exporting) return;
    setExporting(true);
    setMessage("");
    try {
      await exportDailySales(
        receipts,
        `${demo ? "TEST-" : ""}${date || "all-days"}${cashier ? "-employee" : ""}`,
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
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Огноо
          <select
            aria-label="Огнооны хүрээ"
            value={date ? "day" : "all"}
            onChange={(e) => {
              onDateChange(
                e.target.value === "all"
                  ? ""
                  : salesDay(new Date().toISOString()),
              );
              setMessage("");
            }}
            className={fieldClass}
          >
            <option value="day">Өдөр сонгох</option>
            <option value="all">Бүх өдөр</option>
          </select>
        </label>
        {date && (
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Борлуулалтын өдөр
            <input
              aria-label="Борлуулалтын өдөр"
              type="date"
              value={date}
              onChange={(e) => {
                onDateChange(e.target.value);
                setMessage("");
              }}
              className={fieldClass}
            />
          </label>
        )}
        <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-slate-600">
          Ажилтан
          <select
            aria-label="Ажилтан"
            value={cashier}
            onChange={(e) => {
              onCashierChange(e.target.value);
              setMessage("");
            }}
            className={`${fieldClass} max-w-64`}
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
      <p className="mt-2 text-xs text-slate-500">
        {receipts.length} баримт · Улаанбаатарын цагаар · Excel нь шүүлтүүрийг
        дагана, буцаалтыг оруулахгүй
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
