"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Loader2, ReceiptText, RefreshCw, X } from "lucide-react";
import { DailySalesExport } from "./DailySalesExport";
import { useSalesHistory } from "../hooks/useSalesHistory";
import { SoldProductsList } from "./SoldProductsList";

interface Props {
  branchId: string;
  onClose: () => void;
}

export function SalesReportDialog({ branchId, onClose }: Props) {
  const history = useSalesHistory(branchId);
  const { receipts, loading, error } = history;
  const completedReceipts = receipts.filter(
    (receipt) => receipt.status === "COMPLETED",
  );
  const onRefresh = history.refresh;
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="pos-sales-history-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      className="fixed inset-0 m-auto h-[min(860px,calc(100dvh-32px))] max-h-none w-[min(1200px,calc(100vw-32px))] max-w-none overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2
              id="pos-sales-history-title"
              className="flex items-center gap-2 text-lg font-bold"
            >
              <ReceiptText className="h-5 w-5 text-blue-600" />
              Борлуулалтын дэлгэрэнгүй тайлан
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Зарагдсан бараа · Хэн, хэзээ, ямар бараа зарсан
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label="Борлуулалтын дэлгэрэнгүй тайлан хаах"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <X size={20} />
          </button>
        </header>
        <DailySalesExport
          range={history.range}
          onRangeChange={history.setRange}
          cashier={history.cashier}
          onCashierChange={history.setCashier}
          employees={history.employees}
          receipts={completedReceipts}
          loading={loading}
          demo={history.demo}
          onDemoChange={history.setDemo}
        />
        <section
          aria-label="Зарагдсан барааны жагсаалт"
          className="flex min-h-0 flex-1 flex-col gap-3 p-4"
          aria-busy={loading}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold">Зарагдсан бараанууд</h3>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Шинэчлэх
            </button>
          </div>
          {error ? (
            <p
              role="alert"
              className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
            >
              {error}
            </p>
          ) : loading ? (
            <p role="status" className="p-4 text-sm text-slate-500">
              Зарагдсан бараа ачаалж байна…
            </p>
          ) : (
            <SoldProductsList receipts={completedReceipts} />
          )}
        </section>
      </div>
    </dialog>,
    document.body,
  );
}
