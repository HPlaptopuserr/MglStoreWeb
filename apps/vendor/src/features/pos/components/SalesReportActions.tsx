"use client";

import { useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import type { PosReceipt } from "@mgl/types";
import {
  exportDailySales,
  type SalesReportView,
} from "../utils/export-daily-sales";

interface Props {
  receipts: PosReceipt[];
  period: string;
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
  const selected = views.find((option) => option.value === view);
  async function download() {
    if (disabled || exporting) return;
    setExporting(true);
    setFeedback(null);
    try {
      await exportDailySales(receipts, period, view);
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
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {onViewChange && (
          <div
            role="group"
            aria-label="Харуулах болон Excel татах тайлангийн төрөл"
            className="grid w-full grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 sm:w-auto"
          >
            {views.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={view === option.value}
                onClick={() => {
                  onViewChange(option.value);
                  setFeedback(null);
                }}
                className={`min-h-10 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-blue-600 ${view === option.value ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={disabled}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold transition hover:bg-slate-50 focus-visible:outline-blue-600 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Шинэчлэх
            </button>
          )}
          <button
            type="button"
            onClick={download}
            aria-busy={exporting}
            disabled={
              disabled ||
              exporting ||
              !receipts.some(
                (receipt) =>
                  receipt.status === "COMPLETED" && receipt.lines.length > 0,
              )
            }
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {exporting
              ? "Бэлтгэж байна…"
              : selected
                ? `${selected.label} · Excel татах`
                : "Excel татах"}
          </button>
        </div>
      </div>
      {selected && (
        <p className="text-xs leading-5 text-slate-500">
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
