"use client";

import { useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import type { PosReceipt } from "@mgl/types";
import {
  exportDailySales,
  type SalesReportView,
} from "../utils/export-daily-sales";

import type { SalesExportContext } from "../utils/sales-report-workbook";

interface Props {
  receipts: PosReceipt[];
  period: string;
  context?: SalesExportContext;
  disabled: boolean;
  view?: SalesReportView;
  onViewChange?: (view: SalesReportView) => void;
  onRefresh?: () => void;
}
const views = [
  {
    value: "summary",
    label: "Бараагаар нэгтгэл",
    description:
      "Бараа бүрийн нийт зарагдсан хэмжээ, борлуулалтын дүнг нэгтгэж татна.",
  },
  {
    value: "details",
    label: "Борлуулалт бүрээр",
    description:
      "Борлуулалт бүрийн огноо, ажилтан, төлбөрийн дэлгэрэнгүйг татна.",
  },
] as const;

export function SalesReportActions({
  receipts,
  period,
  context,
  disabled,
  view,
  onViewChange,
  onRefresh,
}: Props) {
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const scope = context
    ? `${context.test ? "ТЕСТ · " : ""}${context.from ? context.from.replaceAll("-", ".") : "Эхнээс"} – ${context.to ? context.to.replaceAll("-", ".") : "Бүх өдөр"} · ${context.cashierName || "Бүх ажилтан"}`
    : undefined;
  const selected = views.find((option) => option.value === view);
  async function download() {
    if (disabled || exporting) return;
    setExporting(true);
    setFeedback(null);
    try {
      await exportDailySales(receipts, period, view, context);
      setFeedback({
        text: `${selected?.label || "Борлуулалтын тайлан"} — Excel файл татагдлаа.`,
        error: false,
      });
    } catch (error: unknown) {
      setFeedback({
        text:
          error instanceof Error
            ? error.message
            : "Excel татахад алдаа гарлаа.",
        error: true,
      });
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur sm:p-3">
      {scope && (
        <p
          className="truncate text-xs font-medium text-slate-600"
          title={scope}
        >
          {scope}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {onViewChange && (
          <div
            role="group"
            aria-label="Харуулах болон Excel татах тайлангийн төрөл"
            className="grid w-full grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 lg:w-auto"
          >
            {views.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={view === option.value}
                disabled={exporting}
                onClick={() => {
                  onViewChange(option.value);
                  setFeedback(null);
                }}
                className={`min-h-11 rounded-lg px-2 py-2 text-xs sm:px-3 sm:text-sm font-semibold transition focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60 ${view === option.value ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex w-full items-center gap-2 lg:w-auto">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={disabled || exporting}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold transition hover:bg-slate-50 focus-visible:outline-blue-600 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Шинэчлэх
            </button>
          )}
          <button
            type="button"
            onClick={download}
            aria-busy={exporting}
            aria-label={
              selected ? `${selected.label} · Excel татах` : "Excel татах"
            }
            disabled={
              disabled ||
              exporting ||
              !receipts.some(
                (receipt) =>
                  receipt.status === "COMPLETED" && receipt.lines.length > 0,
              )
            }
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 lg:flex-none"
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {exporting ? "Бэлтгэж байна…" : "Excel татах"}
          </button>
        </div>
      </div>
      {selected && (
        <p className="sr-only">
          {selected.description} Сонгосон огноо, ажилтны шүүлтүүр үйлчилнэ.
        </p>
      )}
      {feedback && (
        <p
          role={feedback.error ? "alert" : "status"}
          className={`text-sm ${feedback.error ? "text-rose-700" : "text-emerald-700"}`}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}
