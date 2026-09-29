"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, ReceiptText, RefreshCw, X } from "lucide-react";
import { DailySalesExport } from "./DailySalesExport";
import { useSalesHistory } from "../hooks/useSalesHistory";
import { ReceiptHistoryItem } from "./ReceiptHistoryItem";
import { ReceiptPreview } from "./ReceiptPreview";

interface Props {
  branchId: string;
  onClose: () => void;
}

export function SalesReportDialog({ branchId, onClose }: Props) {
  const history = useSalesHistory(branchId);
  const { receipts, loading, error } = history;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedReceipt =
    receipts.find((receipt) => receipt.id === selectedId) ?? null;
  const onSelect = setSelectedId;
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
              Салбарын {receipts.length} баримт · Дэлгэрэнгүй харах, дахин
              хэвлэх
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
          date={history.date}
          onDateChange={history.setDate}
          cashier={history.cashier}
          onCashierChange={history.setCashier}
          employees={history.employees}
          receipts={receipts}
          loading={loading}
          demo={history.demo}
          onDemoChange={history.setDemo}
        />
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(140px,0.4fr)_minmax(0,0.6fr)] md:grid-cols-[minmax(280px,0.38fr)_minmax(0,0.62fr)] md:grid-rows-1">
          <section
            aria-label="Баримтын жагсаалт"
            className="flex min-h-0 flex-col border-b border-slate-200 p-4 md:border-b-0 md:border-r"
          >
            <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Шүүсэн баримтууд</h3>
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold transition hover:bg-slate-50 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Шинэчлэх
              </button>
            </div>
            {error && (
              <p
                role="alert"
                className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
              >
                {error}
              </p>
            )}
            <div
              aria-busy={loading}
              className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1"
            >
              {loading && receipts.length === 0 ? (
                <p role="status" className="p-4 text-sm text-slate-500">
                  Баримт ачаалж байна…
                </p>
              ) : receipts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Сонгосон өдөр, ажилтанд тохирох баримт байхгүй байна.
                </div>
              ) : (
                receipts.map((receipt) => (
                  <ReceiptHistoryItem
                    key={receipt.id}
                    receipt={receipt}
                    selected={receipt.id === selectedReceipt?.id}
                    onSelect={onSelect}
                  />
                ))
              )}
            </div>
          </section>
          <section
            aria-label="Сонгосон баримтын дэлгэрэнгүй"
            className="min-h-0 overflow-y-auto overscroll-contain bg-slate-50 p-4 md:p-6"
          >
            {selectedReceipt ? (
              <div className="mx-auto w-full max-w-xl">
                {history.demo ? (
                  <div className="rounded-xl border border-amber-200 bg-white p-4">
                    <h3 className="font-bold">
                      {selectedReceipt.receiptNo} · Тест баримт
                    </h3>
                    <p className="mt-2 text-sm">
                      {selectedReceipt.cashierName}
                    </p>
                    {selectedReceipt.lines.map((line) => (
                      <p key={line.productId} className="mt-3 text-sm">
                        {line.name} · {line.qty} {line.measureUnit} · ₮
                        {line.lineTotal.toLocaleString("mn-MN")}
                      </p>
                    ))}
                    <p className="mt-3 text-xs text-amber-700">
                      Тест баримтыг буцаах, төлбөр хийх боломжгүй.
                    </p>
                  </div>
                ) : (
                  <ReceiptPreview
                    allowReturns={false}
                    receipt={selectedReceipt}
                    className="w-full shadow-sm"
                  />
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-32 flex-col items-center justify-center gap-3 text-center text-sm text-slate-500">
                <ReceiptText size={32} className="text-slate-300" />
                <p>Жагсаалтаас баримт сонгож дэлгэрэнгүйг харна уу.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
