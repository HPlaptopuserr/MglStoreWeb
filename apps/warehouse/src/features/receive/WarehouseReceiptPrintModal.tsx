"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { WarehouseReceiptPrintView } from "./WarehouseReceiptPrintView";

export function WarehouseReceiptPrintModal({
  receiptId,
  onClose,
}: {
  receiptId: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      aria-label="Баримт хэвлэх урьдчилсан харагдац"
      className="fixed inset-0 m-auto h-[90dvh] w-[calc(100%-2rem)] max-w-6xl overflow-hidden rounded-2xl border-0 bg-slate-100 p-0 shadow-2xl backdrop:bg-slate-900/50"
    >
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
        <h2 className="font-semibold text-slate-900">Баримт хэвлэх</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Хэвлэх цонх хаах"
          className="rounded-lg p-2 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <X size={20} />
        </button>
      </header>
      <div className="h-[calc(100%-65px)] overflow-auto">
        <WarehouseReceiptPrintView id={receiptId} onClose={onClose} />
      </div>
    </dialog>
  );
}
