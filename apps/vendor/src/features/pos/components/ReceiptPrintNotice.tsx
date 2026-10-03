"use client";
import type { PosReceipt } from "../types/receipt.types";
import { printReceipt } from "../utils/print-receipt";

export function ReceiptPrintNotice({ receipt, onDismiss }: {
  receipt: PosReceipt | null;
  onDismiss: () => void;
}) {
  if (!receipt) return null;
  return <aside role="status" className="fixed right-4 top-4 z-[140] max-w-sm rounded-xl border border-blue-200 bg-white p-4 text-slate-900 shadow-xl">
    <p className="font-semibold">Борлуулалт бүртгэгдлээ · {receipt.receiptNo}</p>
    <p className="mt-1 text-sm text-slate-600">Хэвлэх цонх нээгдээгүй бол доорх товчийг дарна уу.</p>
    <div className="mt-3 flex gap-2">
      <button type="button" onClick={() => printReceipt(receipt)} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">Баримт хэвлэх</button>
      <button type="button" onClick={onDismiss} className="rounded-lg border px-4 py-2 hover:bg-slate-100">Хаах</button>
    </div>
  </aside>;
}
