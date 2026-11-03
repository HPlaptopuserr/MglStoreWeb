"use client";
import { CheckCircle2, Clock3 } from "lucide-react";
import type { CheckoutPaymentEntry } from "./PosCheckoutView";
import { PAYMENT_METHODS } from "../constants/payment-methods";
import type { PaymentFeedback } from "../types/payment-status.types";
import { paymentDisplayStatus } from "../utils/payment-display-status";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { formatMoney } from "../utils/pos-display-format";

interface Props {
  entries: CheckoutPaymentEntry[];
  remaining: number;
  disabled?: boolean;
  onCheckQr: (id: string) => void;
  onCheckCard?: (id: string) => void;
  feedback?: PaymentFeedback;
  onRemove: (id: string) => void | Promise<void>;
}

export function CheckoutPaymentLedger({
  entries,
  remaining,
  disabled,
  onCheckQr,
  onCheckCard,
  feedback,
  onRemove,
}: Props) {
  const confirmed = entries.filter((entry) => entry.status === "confirmed");
  const paid =
    confirmed.reduce((sum, entry) => sum + Math.round(entry.amount * 100), 0) /
    100;
  return (
    <section
      aria-label="Хувааж төлсөн төлбөрүүд"
      className="max-h-64 shrink-0 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-100/50 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700">
        <h3>Төлбөрийн задаргаа</h3>
        <span aria-live="polite">
          Төлсөн {formatMoney(paid)} · Үлдэгдэл {formatMoney(remaining)}
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs leading-5 text-slate-500">
          Нэг борлуулалтыг хэд хэдэн хэлбэрээр хувааж төлж болно. Баталгаажсан
          төлбөр бүр энд нэмэгдэнэ.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => {
            const bankConfirmed =
              entry.status === "confirmed" &&
              (entry.method === "CARD" || entry.method === "QR");
            const label =
              PAYMENT_METHODS.find((method) => method.value === entry.method)
                ?.label || entry.method;
            const Icon = entry.status === "confirmed" ? CheckCircle2 : Clock3;
            return (
              <li
                key={entry.id}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Icon
                      size={15}
                      aria-hidden="true"
                      className={
                        entry.status === "confirmed"
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }
                    />
                    {label}{" "}
                    <span className="tabular-nums">
                      {formatMoney(entry.amount)}
                    </span>
                  </p>
                  <PaymentStatusBadge
                    status={
                      entry.status === "confirmed" ? "success" : "pending"
                    }
                  />
                </div>
                {entry.cash && (
                  <p className="mt-1 text-xs text-slate-600">
                    Авсан: {formatMoney(entry.cash.receivedAmount)} · Хариулт:{" "}
                    {formatMoney(entry.cash.changeAmount)}
                  </p>
                )}
                {entry.transactionId && (
                  <p className="mt-1 break-all font-mono text-[11px] text-slate-500">
                    Гүйлгээ: {entry.transactionId}
                  </p>
                )}
                {entry.invoiceId && (
                  <p className="mt-1 break-all text-[11px] text-slate-500">
                    Төлбөрийн лавлах: {entry.invoiceId}
                  </p>
                )}
                {entry.credit && (
                  <p className="mt-1 text-xs text-slate-600">
                    {entry.credit.borrowerName}
                    {entry.credit.employeeName
                      ? ` · ${entry.credit.employeeName}`
                      : ""}{" "}
                    · Хүү: {formatMoney(entry.credit.totalInterest)} · Нийт:{" "}
                    {formatMoney(entry.credit.totalDue)} ·{" "}
                    {entry.credit.termMonths} сар
                  </p>
                )}
                {entry.method === "CARD" &&
                  entry.status === "pending" &&
                  entry.attemptId &&
                  onCheckCard && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onCheckCard(entry.id)}
                      className="mt-2 min-h-8 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      Төлөв шалгах
                    </button>
                  )}
                {!bankConfirmed && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {entry.method === "QR" && entry.status === "pending" && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onCheckQr(entry.id)}
                        className="min-h-8 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50"
                      >
                        Төлөв шалгах
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={
                        disabled ||
                        (entry.method === "CARD" && entry.status === "pending")
                      }
                      onClick={() => {
                        void onRemove(entry.id);
                      }}
                      aria-label={`${label} ${formatMoney(entry.amount)} ${entry.method === "QR" ? "цуцлах" : "устгах"}`}
                      className="min-h-8 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50"
                    >
                      {entry.method === "QR" ? "QR цуцлах" : "Устгах"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
