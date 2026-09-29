"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { PosReceipt, RegisterConfig } from "@mgl/types";
import { ReceiptHistoryItem } from "./ReceiptHistoryItem";
import { ReceiptPreview } from "./ReceiptPreview";

interface Props {
  onClose: () => void;
  receipts: PosReceipt[];
  selectedReceipt: PosReceipt | null;
  register: RegisterConfig | null;
  loading: boolean;
  error: string;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  onVoided: (message: string) => void;
}
export function CurrentShiftHistory({
  onClose,
  receipts,
  selectedReceipt,
  register,
  loading,
  error,
  onSelect,
  onRefresh,
  onVoided,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="shift-history-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      className="fixed inset-0 m-auto h-[min(850px,calc(100dvh-24px))] max-h-none w-[min(1100px,calc(100vw-24px))] max-w-none overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/50"
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-3">
          <h2 id="shift-history-title" className="font-bold">
            Борлуулалтын түүх
          </h2>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-100 focus-visible:outline-blue-600"
          >
            Хаах
          </button>
        </header>

        <div className="grid flex-1 min-h-0 min-w-0 grid-rows-[minmax(120px,0.4fr)_minmax(0,0.6fr)] gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[minmax(150px,0.4fr)_minmax(0,0.6fr)] md:grid-rows-1">
          <section
            aria-label="Одоогийн ээлжийн баримтууд"
            className="flex min-h-0 min-w-0 flex-col"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Сүүлийн баримтууд</h3>
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="rounded-lg border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
              >
                {loading ? "Ачаалж байна…" : "Шинэчлэх"}
              </button>
            </div>
            <p className="mb-2 text-xs text-slate-500">
              Одоогийн ээлж · {receipts.length} баримт
            </p>
            {error && (
              <p role="alert" className="mb-2 text-xs text-rose-600">
                {error}
              </p>
            )}
            <div
              className="min-h-0 flex-1 space-y-2 overflow-y-auto"
              aria-busy={loading}
            >
              {!loading && !receipts.length && (
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                  Энэ ээлжид борлуулалт бүртгэгдээгүй байна.
                </p>
              )}
              {receipts.map((receipt) => (
                <ReceiptHistoryItem
                  key={receipt.id}
                  receipt={receipt}
                  selected={receipt.id === selectedReceipt?.id}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </section>
          <section
            aria-label="Баримтын харагдац"
            className="min-h-0 min-w-0 overflow-auto rounded-xl bg-slate-50 p-2"
          >
            {selectedReceipt ? (
              <ReceiptPreview
                key={selectedReceipt.id}
                receipt={selectedReceipt}
                register={register}
                onVoided={onVoided}
              />
            ) : (
              <p className="p-4 text-center text-sm text-slate-500">
                Баримт сонгоно уу
              </p>
            )}
          </section>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
