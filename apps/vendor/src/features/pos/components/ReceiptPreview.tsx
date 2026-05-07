"use client";

import { useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import type { PosReceipt } from "../types/receipt.types";
import { formatReceipt } from "../utils/format-receipt";
import { voidPushEcr } from "../api/card-terminal";

type Props = {
  receipt: PosReceipt | null;
};

export function ReceiptPreview({ receipt }: Props) {
  const [voiding, setVoiding] = useState(false);
  const [voidResult, setVoidResult] = useState<{ succeed: boolean; message?: string } | null>(null);

  if (!receipt) return null;

  const cardLine = receipt.paymentBreakdown?.find(
    (p) => p.method === "CARD" && p.traceno && p.terminalId,
  );

  const handleVoid = async () => {
    if (!cardLine?.traceno || !cardLine?.terminalId) return;
    if (!confirm(`Гүйлгээ буцаалт хийх үү?\nReceipt: ${receipt.receiptNo}`)) return;
    setVoiding(true);
    setVoidResult(null);
    try {
      const res = await voidPushEcr({ terminalId: cardLine.terminalId, traceno: cardLine.traceno });
      setVoidResult(res);
    } catch {
      setVoidResult({ succeed: false, message: "Холболтын алдаа гарлаа" });
    } finally {
      setVoiding(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Receipt Preview</h3>
        {cardLine && !voidResult?.succeed && (
          <button
            onClick={handleVoid}
            disabled={voiding}
            className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors"
          >
            {voiding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Буцаалт хийх
          </button>
        )}
      </div>

      {voidResult && (
        <div className={`mt-2 rounded-lg px-3 py-2 text-xs font-medium ${voidResult.succeed ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700"}`}>
          {voidResult.succeed ? "✓ Буцаалт амжилттай боллоо" : `✗ ${voidResult.message || "Буцаалт амжилтгүй боллоо"}`}
        </div>
      )}

      <pre className="mt-3 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
        {formatReceipt(receipt)}
      </pre>
    </section>
  );
}
