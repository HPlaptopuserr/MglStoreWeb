"use client";

import { summarizeCashPayments } from "@mgl/types";
import type { PosReceipt } from "../types/receipt.types";

export function CashChangeNotice({
  receipt,
  onDismiss,
}: {
  receipt: PosReceipt | null;
  onDismiss: () => void;
}) {
  const cash = summarizeCashPayments(receipt?.paymentBreakdown ?? []);
  if (!receipt || !cash) return null;
  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-[130] mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-950 p-5 text-white shadow-2xl"
    >
      <div>
        <p className="text-xs text-emerald-200">
          {receipt.receiptNo} · Авсан:{" "}
          {cash.receivedAmount.toLocaleString("mn-MN")} ₮
        </p>
        <p className="mt-1 text-2xl font-black tabular-nums">
          Хариулт: {cash.changeAmount.toLocaleString("mn-MN")} ₮
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-xl border border-emerald-300/50 px-4 py-3 text-sm font-bold transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-white"
      >
        Хаах
      </button>
    </aside>
  );
}
