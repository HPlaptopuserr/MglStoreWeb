"use client";
import { useEffect, useState } from "react";
import type { PosReceipt } from "../types/receipt.types";
import { printReceipt } from "../utils/print-receipt";
import {
  readReceiptPaperWidth,
  saveReceiptPaperWidth,
  type ReceiptPaperWidth,
} from "../utils/receipt-paper";

export function ReceiptPrintNotice({ receipt, onDismiss }: {
  receipt: PosReceipt | null;
  onDismiss: () => void;
}) {
  const [paperWidthMm, setPaperWidthMm] = useState<ReceiptPaperWidth>(58);

  useEffect(() => {
    setPaperWidthMm(readReceiptPaperWidth());
  }, []);

  if (!receipt) return null;

  const handlePaperWidthChange = (width: ReceiptPaperWidth) => {
    setPaperWidthMm(width);
    saveReceiptPaperWidth(width);
  };

  return <aside role="status" className="fixed right-4 top-4 z-[140] max-w-sm rounded-xl border border-blue-200 bg-white p-4 text-slate-900 shadow-xl">
    <p className="font-semibold">Борлуулалт бүртгэгдлээ · {receipt.receiptNo}</p>
    <p className="mt-1 text-sm text-slate-600">Хэвлэх цонх нээгдээгүй бол доорх товчийг дарна уу.</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <select
        value={paperWidthMm}
        onChange={(event) => handlePaperWidthChange(event.target.value === "80" ? 80 : 58)}
        className="rounded-lg border px-3 py-2 text-sm font-semibold"
        aria-label="Баримтын цаасны өргөн"
      >
        <option value={58}>58 мм</option>
        <option value={80}>80 мм</option>
      </select>
      <button type="button" onClick={() => printReceipt(receipt, { paperWidthMm })} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">Баримт хэвлэх</button>
      <button type="button" onClick={onDismiss} className="rounded-lg border px-4 py-2 hover:bg-slate-100">Хаах</button>
    </div>
  </aside>;
}
