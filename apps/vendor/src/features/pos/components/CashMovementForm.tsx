"use client";

import { MinusCircle, PlusCircle } from "lucide-react";
import { useId } from "react";
import type { CashDrawerEventType } from "../types/shift.types";
import { formatMoney } from "../utils/pos-display-format";

interface Props {
  type: CashDrawerEventType;
  amount: string;
  note: string;
  expectedCash: number | null;
  disabled: boolean;
  submitting: boolean;
  onTypeChange: (type: CashDrawerEventType) => void;
  onAmountChange: (amount: string) => void;
  onNoteChange: (note: string) => void;
  onSubmit: () => void;
}

export function CashMovementForm({
  type,
  amount,
  note,
  expectedCash,
  disabled,
  submitting,
  onTypeChange,
  onAmountChange,
  onNoteChange,
  onSubmit,
}: Props) {
  const id = useId();
  const paidOut = type === "PAID_OUT";
  const value = Number(amount);
  const insufficient = paidOut && expectedCash !== null && value > expectedCash;
  const valid =
    Number.isFinite(value) &&
    value > 0 &&
    !insufficient &&
    (!paidOut || !!note.trim());
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !disabled && !submitting) onSubmit();
      }}
      className="space-y-3 rounded-xl border border-slate-200 p-3"
    >
      <fieldset
        disabled={disabled || submitting}
        className="space-y-3 disabled:opacity-60"
      >
        <legend className="sr-only">Бэлэн мөнгөний хөдөлгөөн бүртгэх</legend>
        <div className="flex gap-2">
          {(
            [
              ["PAID_OUT", "Бэлэн зарлага", MinusCircle],
              ["PAID_IN", "Бэлэн нэмэх", PlusCircle],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={type === value}
              onClick={() => onTypeChange(value)}
              className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${type === value ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <p id={`${id}-purpose`} className="text-xs leading-4 text-slate-500">
          {paidOut
            ? "Кассын бэлэн мөнгөөр бараа, хангамж худалдан авсан эсвэл бусад төлбөр төлсөн бол энд бүртгэнэ. Зарлага нь борлуулалтын дүнг өөрчлөхгүй, кассын үлдэгдлээс хасагдана."
            : "Кассанд нэмж хийсэн задгай мөнгө, бусад бэлэн орлогыг бүртгэнэ. Борлуулалтын орлогыг энд давхар бүртгэхгүй."}
        </p>
        <label
          className="block text-xs font-semibold text-slate-700"
          htmlFor={`${id}-amount`}
        >
          Дүн (₮)
          <input
            id={`${id}-amount`}
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            aria-invalid={insufficient}
            aria-describedby={`${id}-balance`}
            placeholder="Жишээ: 25000"
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-base font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label
          className="block text-xs font-semibold text-slate-700"
          htmlFor={`${id}-note`}
        >
          {paidOut ? "Зориулалт / хэнд төлсөн *" : "Тайлбар"}
          <textarea
            id={`${id}-note`}
            required={paidOut}
            maxLength={500}
            rows={2}
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            aria-describedby={`${id}-purpose`}
            placeholder={
              paidOut
                ? "Жишээ: Нийлүүлэгч Бат — ундаа худалдан авсан, баримт №123"
                : "Жишээ: эзнээс нэмсэн задгай мөнгө"
            }
            className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <div
          id={`${id}-balance`}
          role="status"
          aria-live="polite"
          className={`rounded-lg px-3 py-2 text-sm ${insufficient ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-800"}`}
        >
          {expectedCash === null ? (
            "Үлдэгдлийн мэдээлэл ачаалсны дараа бүртгэнэ."
          ) : insufficient ? (
            "Зарлагын дүн кассын бэлэн үлдэгдлээс их байна."
          ) : (
            <>
              Үлдэгдэл: <strong>{formatMoney(expectedCash)}</strong>
              {Number.isFinite(value) && value > 0 && (
                <span className="mt-1 block">
                  Бүртгэсний дараа:{" "}
                  <strong>
                    {formatMoney(expectedCash + (paidOut ? -value : value))}
                  </strong>
                </span>
              )}
            </>
          )}
        </div>
        <button
          type="submit"
          disabled={!valid || expectedCash === null}
          className="min-h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
        >
          {submitting
            ? "Бүртгэж байна…"
            : paidOut
              ? "Зарлага бүртгэх"
              : "Бэлэн мөнгө нэмэх"}
        </button>
      </fieldset>
    </form>
  );
}
