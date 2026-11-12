"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileDown,
  ImageIcon,
  X,
} from "lucide-react";
import { Button } from "@mgl/ui";
import {
  requestCatalogDownload,
  startNativeCatalogDownload,
} from "./catalog-download";
import { STOCK_STATUS_LABELS, type InventoryFilters } from "./inventory.types";

interface Props extends InventoryFilters {
  warehouseName: string;
  disabled?: boolean;
}

function CatalogExportAction({ disabled, ...filters }: Props) {
  const [inStockOnly, setInStockOnly] = useState(filters.status !== "out");
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const exportCatalog = async () => {
    if (request.current || !filters.warehouseId) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setFinished(false);
    setFeedback("Chrome таталтын хүсэлтийг бэлтгэж байна…");
    try {
      const ticket = await requestCatalogDownload(
        filters,
        inStockOnly,
        controller.signal,
      );
      controller.signal.throwIfAborted();
      startNativeCatalogDownload(filters.warehouseId, ticket);
      setFinished(true);
      setFeedback(
        "Таталтын хүсэлтийг Chrome руу шилжүүллээ. Явцыг браузерийн Таталтууд хэсгээс харж, цуцалж болно. Сервер зураг, хуудсыг бэлтгэн дамжуулж байгаа тул энэ хуудсаар үргэлжлүүлэн ажиллаж болно.",
      );
    } catch (caught: unknown) {
      if (!controller.signal.aborted) {
        setFeedback("");
        setError(
          caught instanceof Error && caught.name !== "TimeoutError"
            ? caught.message
            : "PDF бэлтгэж чадсангүй. Дахин оролдоно уу.",
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setBusy(false);
      }
    }
  };

  const cancel = () => {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setFinished(false);
    setFeedback("PDF бэлтгэхийг цуцаллаа.");
  };

  return (
    <section
      aria-label="Худалдааны каталог татах"
      className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ImageIcon size={21} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">
              Худалдааны каталог
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Зураг, код, үнэ, захиалах тооны зайтай PDF. Chrome-ийн таталтаар
              хадгална.
            </p>
            <p className="mt-1.5 text-[11px] font-medium text-blue-700">
              {filters.warehouseName} · {STOCK_STATUS_LABELS[filters.status]}
              {filters.search ? ` · Хайлт: ${filters.search}` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end xl:flex-row xl:items-center">
          <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-600 has-[:checked]:border-blue-200 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-800 has-[:disabled]:cursor-wait">
            <input
              type="checkbox"
              checked={inStockOnly}
              disabled={busy}
              onChange={(event) => {
                setInStockOnly(event.target.checked);
                setFeedback("");
                setError("");
                setFinished(false);
              }}
              className="h-4 w-4 rounded accent-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            />
            Зөвхөн нөөцтэй бараа
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="default"
              onClick={exportCatalog}
              disabled={disabled || !filters.warehouseId}
              isLoading={busy}
              loadingText="Chrome руу шилжүүлж байна…"
              aria-busy={busy}
              title="Хайлт, шүүлтүүрт тохирох бүх идэвхтэй барааны зурагтай каталог татах"
              icon={<FileDown className="h-4 w-4" aria-hidden="true" />}
              className="w-full bg-blue-600 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:ring-blue-500 sm:w-auto"
            >
              Каталог PDF татах
            </Button>
            {busy && (
              <button
                type="button"
                onClick={cancel}
                aria-label="PDF бэлтгэхийг цуцлах"
                title="Цуцлах"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
      {(feedback || error) && (
        <div
          className={`border-t px-4 py-3 sm:px-5 ${error ? "border-red-100 bg-red-50" : finished ? "border-emerald-100 bg-emerald-50" : "border-slate-100 bg-slate-50"}`}
        >
          <p
            role={error ? "alert" : "status"}
            className={`flex items-start gap-2 text-xs leading-relaxed ${error ? "text-red-700" : finished ? "text-emerald-800" : "text-slate-600"}`}
          >
            {error ? (
              <AlertCircle
                size={15}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
            ) : finished ? (
              <CheckCircle2
                size={15}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
            ) : null}
            {error || feedback}
          </p>
        </div>
      )}
    </section>
  );
}

export function InventoryCatalogExportButton(props: Props) {
  return (
    <CatalogExportAction
      key={JSON.stringify([props.warehouseId, props.search, props.status])}
      {...props}
    />
  );
}
