"use client";
import { useState } from "react";
import { FileText, Loader2, RefreshCw } from "lucide-react";
import {
  exportProductReportToPdf,
  type ProductReportExportOptions,
} from "./export-product-report";

interface Props {
  options: ProductReportExportOptions;
  loading: boolean;
  onRefresh: () => void;
}
export function InventoryReportActions({ options, loading, onRefresh }: Props) {
  const [error, setError] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold transition hover:bg-slate-50 focus-visible:outline-indigo-600 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Шинэчлэх
        </button>
        <button
          data-tour="report-pdf"
          type="button"
          disabled={loading || !options.products.length}
          onClick={() => {
            setError("");
            try {
              exportProductReportToPdf(options);
            } catch (cause: unknown) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "PDF бэлтгэж чадсангүй.",
              );
            }
          }}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 focus-visible:outline-indigo-600 disabled:opacity-50"
        >
          <FileText size={16} />
          PDF хэвлэх / хадгалах
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
