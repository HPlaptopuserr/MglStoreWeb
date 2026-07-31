import { AlertTriangle, X } from "lucide-react";
import type { OnlineOrder } from "./online-order.types";

interface OrderActionDialogProps {
  order: OnlineOrder;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const COPY = {
  CONFIRMED: {
    title: "Бэлтгэж эхлэх үү?",
    body: "Захиалгын барааг агуулахын бэлтгэлд оруулж, захиалагчид мэдэгдэл илгээнэ.",
    action: "Тийм, бэлтгэж эхлэх",
  },
  PREPARING: {
    title: "Бараа бүрэн бэлтгэгдсэн үү?",
    body: "Тоо ширхэг, SKU болон барааны бүрэн бүтэн байдлыг шалгасны дараа баталгаажуулна уу.",
    action: "Тийм, бэлтгэгдсэн",
  },
} as const;

export function OrderActionDialog({
  order,
  busy,
  onCancel,
  onConfirm,
}: OrderActionDialogProps) {
  if (order.status !== "CONFIRMED" && order.status !== "PREPARING") return null;
  const copy = COPY[order.status];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="order-action-title"
        className="w-full rounded-t-3xl bg-white p-6 shadow-2xl sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <AlertTriangle size={22} />
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Цонх хаах"
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>
        <h2
          id="order-action-title"
          className="mt-5 text-xl font-black text-slate-950"
        >
          {copy.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{copy.body}</p>
        <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs font-bold text-slate-700">
          #{order.orderNumber}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Болих
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? "Түр хүлээнэ үү..." : copy.action}
          </button>
        </div>
      </div>
    </div>
  );
}
