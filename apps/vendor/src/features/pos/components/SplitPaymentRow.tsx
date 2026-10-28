"use client";
import { useId } from "react";
import { Banknote, CreditCard, QrCode } from "lucide-react";
import {
  SPLIT_PAYMENT_LABELS,
  type SplitPaymentMethod,
  type SplitPaymentPlan,
} from "../utils/split-payment-plan";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { paymentDisplayStatus } from "../utils/payment-display-status";
import type { PaymentFailureFeedback } from "../types/payment-status.types";
import { formatMoney } from "../utils/pos-display-format";

const ICONS = { CARD: CreditCard, QR: QrCode, CASH: Banknote } as const;
interface Props {
  method: SplitPaymentMethod;
  value: string;
  amount: number;
  automatic: boolean;
  locked: boolean;
  status: SplitPaymentPlan["statuses"][SplitPaymentMethod];
  error?: string;
  feedback?: PaymentFailureFeedback;
  onCheckStatus?: () => void;
  checkDisabled?: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onModeChange: (automatic: boolean) => void;
}
export function SplitPaymentRow({
  method,
  value,
  amount,
  automatic,
  locked,
  status,
  error,
  feedback,
  onCheckStatus,
  checkDisabled,
  disabled,
  onChange,
  onModeChange,
}: Props) {
  const displayStatus = paymentDisplayStatus(status, amount, feedback);
  const inputId = useId();
  const errorId = useId();
  const label = SPLIT_PAYMENT_LABELS[method];
  const Icon = ICONS[method];
  return (
    <section
      aria-label={`${label} хуваарилалт`}
      className={`rounded-xl border p-3 transition-colors ${displayStatus === "failed" ? "border-rose-200 bg-rose-50/30" : displayStatus === "unknown" ? "border-amber-200 bg-amber-50/30" : locked ? "border-emerald-200 bg-emerald-50/50" : automatic ? "border-blue-200 bg-blue-50/40" : "border-slate-200 bg-white"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={inputId}
            className="flex items-center gap-2 text-sm font-bold text-slate-800"
          >
            <Icon size={17} aria-hidden="true" />
            {label}
          </label>
          <div className="mt-1">
            <PaymentStatusBadge status={displayStatus} />
          </div>
        </div>
        <div className="relative w-36 shrink-0">
          <input
            id={inputId}
            inputMode="decimal"
            placeholder="0"
            autoComplete="off"
            value={locked || automatic ? String(amount) : value}
            readOnly={locked || automatic}
            disabled={disabled && !locked}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-xl font-bold tabular-nums text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50 disabled:opacity-60"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-2.5 font-bold text-slate-400"
          >
            ₮
          </span>
        </div>
      </div>
      {!locked && (
        <div
          className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
          aria-label={`${label} дүн оруулах хэлбэр`}
        >
          <button
            type="button"
            disabled={disabled}
            aria-pressed={!automatic}
            onClick={() => onModeChange(false)}
            className={`min-h-8 rounded-md px-1 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 ${!automatic ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            Гараар
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-pressed={automatic}
            onClick={() => onModeChange(true)}
            className={`min-h-8 rounded-md px-1 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 ${automatic ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            Үлдэгдэл бүтнээр
          </button>
        </div>
      )}
      {feedback &&
        displayStatus !== "success" &&
        displayStatus !== "unused" && (
          <p
            role="alert"
            className={`mt-2 break-words text-xs leading-5 ${displayStatus === "failed" ? "text-rose-700" : "text-amber-800"}`}
          >
            {feedback.message}
          </p>
        )}
      {onCheckStatus &&
        (status === "pending" || displayStatus === "unknown") && (
          <button
            type="button"
            disabled={checkDisabled}
            onClick={onCheckStatus}
            className="mt-2 min-h-9 w-full rounded-lg border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
          >
            Төлөв шалгах
          </button>
        )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-rose-700">
          {error}
        </p>
      )}
      {locked && (
        <p className="sr-only">
          Бүртгэгдсэн дүн {formatMoney(amount)}. Өөрчлөх боломжгүй.
        </p>
      )}
    </section>
  );
}
