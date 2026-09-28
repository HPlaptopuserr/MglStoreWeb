"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { PosReceipt } from "@mgl/types";
import { posRequest } from "../api/_pos-client";
import { exportDailySales } from "../utils/export-daily-sales";

export function DailySalesExport({ branchId }: { branchId?: string }) {
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ulaanbaatar" }).format(
      new Date(),
    ),
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function download() {
    if (!branchId || !date || loading) return;
    setLoading(true);
    setMessage("");
    try {
      const query = new URLSearchParams({ branchId, date });
      const receipts = await posRequest<PosReceipt[]>(`/pos/receipts?${query}`);
      await exportDailySales(receipts, date);
      setMessage("Excel файл татагдлаа.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Excel татахад алдаа гарлаа. Дахин оролдоно уу.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-5 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Борлуулалтын өдөр
          <input
            type="date"
            value={date}
            disabled={loading}
            onChange={(event) => setDate(event.target.value)}
            className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:outline-blue-600"
          />
        </label>
        <button
          type="button"
          onClick={download}
          disabled={!branchId || !date || loading}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          {loading ? "Бэлтгэж байна…" : "Excel татах"}
        </button>
        <p className="text-xs text-slate-500">
          Тухайн салбарын бүх ээлж · Улаанбаатарын цагаар · Буцаалтыг оруулахгүй
        </p>
      </div>
      {message && (
        <p role="status" className="mt-2 text-sm text-slate-700">
          {message}
        </p>
      )}
    </div>
  );
}
