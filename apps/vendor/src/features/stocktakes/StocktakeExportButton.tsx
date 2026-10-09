"use client";
import { useRef, useState } from "react";
import type { StocktakeDetail, StocktakeSummary } from "@mgl/types";

export function StocktakeExportButton({
  session,
  load,
  disabled = false,
}: {
  session: StocktakeSummary;
  load: (id: string) => Promise<StocktakeDetail>;
  disabled?: boolean;
}) {
  const lock = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (session.status !== "APPROVED") return null;
  async function download() {
    if (lock.current) return;
    lock.current = true;
    setLoading(true);
    setError("");
    try {
      const [detail, { downloadStocktake }] = await Promise.all([
        load(session.id),
        import("./stocktake-workbook"),
      ]);
      await downloadStocktake(detail);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Excel тайлан татаж чадсангүй. Дахин оролдоно уу.",
      );
    } finally {
      lock.current = false;
      setLoading(false);
    }
  }
  return (
    <div className="flex max-w-sm flex-col items-start gap-2">
      <button
        type="button"
        onClick={download}
        disabled={disabled || loading}
        aria-busy={loading}
        aria-label={`${session.title}: Excel татах`}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden="true">↓</span>
        {loading ? "Тайлан бэлтгэж байна…" : "Excel татах"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
