import type { PosReceipt } from "@mgl/types";

export function ReceiptHistoryItem({
  receipt,
  selected,
  onSelect,
}: {
  receipt: PosReceipt;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const voided = receipt.status === "VOIDED";
  return (
    <button
      type="button"
      onClick={() => onSelect(receipt.id)}
      aria-pressed={selected}
      className={`w-full rounded-xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-blue-600 ${selected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="break-all text-sm font-bold">
          #{receipt.receiptNo}
        </span>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-bold ${voided ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"}`}
        >
          {voided ? "Буцаагдсан" : "Амжилттай"}
        </span>
      </div>
      <p className="mt-2 break-words text-xs text-slate-600">
        {receipt.cashierName}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-500">
          {new Date(receipt.createdAt).toLocaleString("mn-MN", {
            timeZone: "Asia/Ulaanbaatar",
          })}
        </span>
        <strong className="text-sm tabular-nums">
          ₮
          {receipt.grandTotal.toLocaleString("mn-MN", {
            maximumFractionDigits: 2,
          })}
        </strong>
      </div>
    </button>
  );
}
