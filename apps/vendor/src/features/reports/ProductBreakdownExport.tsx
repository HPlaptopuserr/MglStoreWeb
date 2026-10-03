"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { exportProductBreakdownToExcel, type ProductReportExportOptions } from "./export-product-report";

type Props = Pick<ProductReportExportOptions, "organizationName" | "products" | "filterDescription"> & { loading: boolean };

export function ProductBreakdownExport({ loading, ...options }: Props) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setError("");
    setExporting(true);
    try {
      await exportProductBreakdownToExcel(options);
    } catch {
      setError("Excel татаж чадсангүй. Дахин оролдоно уу.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={loading || exporting || options.products.length === 0}
        onClick={download}
        aria-busy={exporting}
        title="Шүүлтүүрт тохирсон бүх хуудасны барааг татах"
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {exporting ? "Татаж байна..." : "Excel татах"}
      </button>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
