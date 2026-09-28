"use client";

import type { CashPaymentDetails } from "@mgl/types";

interface Props {
  remaining: number;
  enteredAmount: string;
  cash?: CashPaymentDetails;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function CashPaymentPanel({
  remaining,
  enteredAmount,
  cash,
  error,
  disabled,
  onChange,
}: Props) {
  return (
    <section
      aria-label="Бэлэн мөнгөний тооцоо"
      className="shrink-0 space-y-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3"
    >
      <div className="flex items-center justify-between gap-3 text-sm text-zinc-300">
        <span>Төлөх үлдэгдэл</span>
        <strong>{remaining.toLocaleString("mn-MN")} ₮</strong>
      </div>
      <div className="flex items-end gap-2">
        <label className="block min-w-0 flex-1 text-xs font-bold text-zinc-300">
          Авсан мөнгө
          <input
            inputMode="decimal"
            value={enteredAmount}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby="cash-payment-status"
            placeholder="Дүн оруулах"
            className="mt-1 h-11 w-full rounded-xl border border-zinc-600 bg-zinc-950 px-3 text-xl font-bold text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:opacity-50"
          />
        </label>
        <button
          type="button"
          disabled={disabled || remaining <= 0}
          onClick={() => onChange(String(remaining))}
          className="h-11 shrink-0 rounded-xl border border-zinc-600 px-3 text-xs font-bold text-zinc-200 transition hover:border-emerald-400 focus-visible:outline-2 focus-visible:outline-emerald-400 disabled:opacity-50"
        >
          Яг дүнгээр
        </button>
      </div>
      <div id="cash-payment-status" role="status" aria-live="polite">
        {error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : cash ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs text-zinc-400">Хариулт</p>
              <p className="text-2xl font-black tabular-nums text-emerald-300">
                {cash.changeAmount.toLocaleString("mn-MN")} ₮
              </p>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Бэлнээр тооцох:{" "}
              {(cash.receivedAmount - cash.changeAmount).toLocaleString(
                "mn-MN",
              )}{" "}
              ₮
            </p>
          </>
        ) : (
          <p className="text-xs text-zinc-400">
            Авсан мөнгөө оруулах эсвэл «Яг дүнгээр» сонгоно уу.
          </p>
        )}
      </div>
    </section>
  );
}
