import { AlertTriangle, ArrowRight, Loader2, PackageMinus } from "lucide-react";
import type { DispatchDestination } from "./types";
import { dispatchMoney } from "./dispatch-format";

export function DispatchSummary({
  count,
  quantity,
  total,
  destination,
  saving,
  step,
  issue,
  error,
  onNext,
  onConfirm,
}: {
  count: number;
  quantity: number;
  total: number;
  destination: DispatchDestination;
  saving: boolean;
  step: 1 | 2;
  issue: string;
  error: string;
  onNext: () => void;
  onConfirm: () => void;
}) {
  return (
    <aside
      aria-label="Гаргалтын хураангуй"
      className="sticky top-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 bg-slate-50 p-5">
        <h2 className="font-bold text-slate-950">Шалгаж баталгаажуулах</h2>
        <p className="mt-1 text-xs text-slate-500">
          Баталгаажмагц падан үүсэж, агуулахын үлдэгдэл хасагдана.
        </p>
      </div>
      <div className="space-y-4 p-5">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Барааны төрөл</dt>
            <dd className="font-semibold">{count}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Нийт тоо</dt>
            <dd className="font-semibold">{quantity.toLocaleString()}</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <dt className="font-medium text-slate-600">Нийт дүн</dt>
            <dd className="text-xl font-bold text-blue-700">
              {dispatchMoney(total)}
            </dd>
          </div>
        </dl>
        {destination.storeName && (
          <div className="rounded-xl bg-blue-50 p-3 text-sm">
            <p className="break-words font-semibold text-blue-900">
              {destination.storeName}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {destination.recipientName || "Нэр оруулаагүй"} ·{" "}
              {destination.recipientPhone || "Утас оруулаагүй"}
            </p>
            <p className="mt-1 break-words text-xs text-slate-500">
              {destination.address || "Хаяг оруулаагүй"}
            </p>
          </div>
        )}
        {issue && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {issue}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={saving || Boolean(issue)}
          onClick={step === 1 ? onNext : onConfirm}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : step === 1 ? (
            <ArrowRight className="size-4" />
          ) : (
            <PackageMinus className="size-4" />
          )}
          {saving
            ? "Бүртгэж байна…"
            : step === 1
              ? "Дараах · Хүлээн авагч"
              : "Падан үүсгэж бараа гаргах"}
        </button>
      </div>
    </aside>
  );
}
