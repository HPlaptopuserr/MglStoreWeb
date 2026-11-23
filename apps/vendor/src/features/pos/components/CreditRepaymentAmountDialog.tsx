"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "../utils/pos-display-format";

type Props = {
  borrowerName: string;
  balance: number;
  onConfirm: (amount: number) => void;
  onClose: () => void;
};

export function CreditRepaymentAmountDialog({
  borrowerName,
  balance,
  onConfirm,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(String(balance));
  const amount = Number(value);
  const valid =
    /^\d+(?:\.\d{1,2})?$/.test(value) &&
    Number.isFinite(amount) &&
    amount > 0 &&
    Math.round(amount * 100) <= Math.round(balance * 100);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="credit-repayment-title"
      className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-slate-200 p-6 shadow-2xl backdrop:bg-slate-950/50"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onConfirm(amount);
        }}
      >
        <h2
          id="credit-repayment-title"
          className="text-lg font-black text-slate-900"
        >
          Зээлийн төлөх дүн
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {borrowerName} · Үлдэгдэл: <strong>{formatMoney(balance)}</strong>
        </p>
        <label
          htmlFor="credit-repayment-amount"
          className="mt-5 block text-sm font-semibold text-slate-700"
        >
          Одоо төлөх дүн (₮)
        </label>
        <input
          id="credit-repayment-amount"
          autoFocus
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-describedby="credit-repayment-help"
          aria-invalid={!valid}
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-xl font-bold outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
        />
        <p
          id="credit-repayment-help"
          role={valid ? undefined : "alert"}
          className={`mt-2 text-sm ${valid ? "text-slate-500" : "text-red-600"}`}
        >
          {valid
            ? `Төлсний дараах үлдэгдэл: ${formatMoney(Math.max(0, Math.round((balance - amount) * 100) / 100))}`
            : "0-оос их, үлдэгдлээс хэтрэхгүй дүн оруулна уу. Бутархай дүн 2 оронтой байна."}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 font-semibold"
          >
            Буцах
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Төлбөрийн хэлбэр сонгох
          </button>
        </div>
      </form>
    </dialog>
  );
}
