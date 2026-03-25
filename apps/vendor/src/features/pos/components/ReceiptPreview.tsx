import type { PosReceipt } from "../types/receipt.types";
import { formatReceipt } from "../utils/format-receipt";

type Props = {
  receipt: PosReceipt | null;
};

export function ReceiptPreview({ receipt }: Props) {
  if (!receipt) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Receipt Preview</h3>
      <pre className="mt-3 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
        {formatReceipt(receipt)}
      </pre>
    </section>
  );
}
