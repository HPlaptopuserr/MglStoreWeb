"use client";
import { useId } from "react";
import type { CheckoutPaymentAmount as AmountPreview } from "../utils/checkout-payment-amount";
import { formatMoney } from "../utils/pos-display-format";

interface Props {
  value: string;
  remaining: number;
  preview: AmountPreview;
  disabled: boolean;
  onChange: (value: string) => void;
}

export function CheckoutPaymentAmount({
  value,
  remaining,
  preview,
  disabled,
  onChange,
}: Props) {
  const statusId = useId();
  return (
    <section
      aria-label="Хувааж төлөх дүн"
      className="shrink-0 space-y-2 rounded-2xl border border-blue-200 bg-blue-50/50 p-3"
    >
      <div className="flex items-center justify-between gap-3 text-sm text-slate-700">
        <span>Төлөх үлдэгдэл</span>
        <strong className="tabular-nums">{formatMoney(remaining)}</strong>
      </div>
      <label className="block text-xs font-bold text-slate-700">
        Энэ хэлбэрээр төлөх дүн
        <input
          inputMode="decimal"
          autoComplete="off"
          value={value}
          disabled={disabled || remaining <= 0}
          onChange={(event) => onChange(event.target.value)}
          placeholder={String(remaining)}
          aria-invalid={Boolean(preview.error)}
          aria-describedby={statusId}
          className="mt-1 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-2xl font-bold tabular-nums text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
        />
      </label>
      <div id={statusId} aria-live="polite" className="text-xs leading-5">
        {preview.error ? (
          <p role="alert" className="text-rose-700">
            {preview.error}
          </p>
        ) : (
          <p className="text-slate-600">
            {preview.partial
              ? `Хэсэгчилсэн төлбөр · Дараа нь ${formatMoney(preview.balanceAfter)} үлдэнэ.`
              : "Үлдэгдлийг бүтнээр төлнө."}
          </p>
        )}
      </div>
      <button
        type="button"
        disabled={disabled || remaining <= 0}
        onClick={() => onChange(String(remaining))}
        className="min-h-9 w-full rounded-lg border border-blue-200 bg-white px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40"
      >
        Үлдэгдлийг бүтнээр оруулах
      </button>
      <p className="text-xs leading-5 text-slate-600">
        Хэсэгчлэн төлөх бол дүнгээ оруулаад төлнө. Үлдэгдлийг карт, QR эсвэл
        бэлнээр үргэлжлүүлэн төлж болно.
      </p>
    </section>
  );
}
