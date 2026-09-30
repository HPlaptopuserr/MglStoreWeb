"use client";
import { useEffect, useRef, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { useAdminAuth } from "@/lib/admin-auth";
import { API, getApiErrorMessage } from "@/lib/api";

export function SalesStoresExportButton({
  days,
  query,
  status,
}: {
  days: number | "all";
  query: string;
  status: string;
}) {
  const { authFetch } = useAdminAuth();
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function download() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setExporting(true);
    setError(null);
    setMessage(null);
    try {
      const filters = new URLSearchParams({
        days: String(days),
        q: query,
        status,
      });
      const response = await authFetch(
        `${API}/admin/statistics/stores/export.xlsx?${filters}`,
        { signal: controller.signal },
      );
      if (!response.ok)
        throw new Error(
          await getApiErrorMessage(response, "Excel татаж чадсангүй"),
        );
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mgl-stores-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Excel файл бэлэн боллоо. Таталтыг эхлүүллээ.");
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error ? cause.message : "Excel татаж чадсангүй",
        );
    } finally {
      if (!controller.signal.aborted) setExporting(false);
      request.current = null;
    }
  }
  return (
    <div className="max-w-sm">
      <button
        type="button"
        onClick={download}
        disabled={exporting}
        title="Шүүлтүүрт тохирох бүх хуудсын дэлгүүрийг Excel-ээр татах"
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        {exporting ? (
          <LoaderCircle
            aria-hidden="true"
            className="h-4 w-4 motion-safe:animate-spin"
          />
        ) : (
          <Download aria-hidden="true" className="h-4 w-4" />
        )}
        {exporting ? "Excel бэлтгэж байна…" : "Excel татах"}
      </button>
      <p className="mt-1 text-xs text-slate-500">
        Шүүлтүүрт тохирох бүх дэлгүүр · GPS-тай
      </p>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
      <span role="status" className="sr-only">
        {message}
      </span>
    </div>
  );
}
