"use client";
import { useEffect, useRef, useState } from "react";
import {
  getCreditPaymentHistory,
  type CreditPaymentHistoryItem,
} from "../api/credit-payment-history";
import { formatMoney, formatDateTime } from "../utils/pos-display-format";
type Props = {
  organizationId: string;
  onClose: () => void;
  onPrint: (payment: CreditPaymentHistoryItem) => void;
};
const labels: Record<string, string> = {
  CASH: "Бэлэн",
  CARD: "Карт",
  QPAY: "QR",
  BANK_TRANSFER: "Шилжүүлэг",
};
export function CreditPaymentHistoryDialog({
  organizationId,
  onClose,
  onPrint,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [payments, setPayments] = useState<CreditPaymentHistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [request, setRequest] = useState({ cursor: "", refresh: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void getCreditPaymentHistory(
      organizationId,
      request.cursor,
      controller.signal,
    )
      .then((page) => {
        if (controller.signal.aborted) return;
        setPayments((previous) =>
          request.cursor
            ? [
                ...previous,
                ...page.payments.filter(
                  (item) => !previous.some((saved) => saved.id === item.id),
                ),
              ]
            : page.payments,
        );
        setNextCursor(page.nextCursor);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Төлөлтийн түүх авч чадсангүй",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [organizationId, request]);
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="credit-history-title"
      className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 p-5 shadow-2xl backdrop:bg-slate-950/50"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="credit-history-title"
          className="text-lg font-black text-slate-900"
        >
          Зээлийн төлөлтийн түүх
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border px-3 py-2 text-sm font-semibold"
        >
          Хаах
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Дахин хэвлэх нь төлбөр авахгүй, шинэ eBarimt үүсгэхгүй.
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={() =>
          setRequest((previous) => ({
            cursor: "",
            refresh: previous.refresh + 1,
          }))
        }
        className="my-3 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"
      >
        Шинэчлэх
      </button>
      {error && (
        <div
          role="alert"
          className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
          <button
            type="button"
            onClick={() =>
              setRequest((previous) => ({
                ...previous,
                refresh: previous.refresh + 1,
              }))
            }
            className="ml-3 font-bold underline"
          >
            Дахин оролдох
          </button>
        </div>
      )}
      {loading && (
        <p role="status" className="py-3 text-sm text-slate-500">
          Төлөлтүүд ачаалж байна…
        </p>
      )}
      {!loading && !error && !payments.length && (
        <p className="py-5 text-sm text-slate-500">
          Бүртгэгдсэн зээлийн төлөлт алга.
        </p>
      )}
      <ul className="space-y-2" aria-busy={loading}>
        {payments.map((payment) => (
          <li
            key={payment.id}
            className="rounded-xl border border-slate-200 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-900">
                  {payment.borrowerNames.join(", ") || "Зээлийн төлөлт"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDateTime(payment.createdAt)} ·{" "}
                  {labels[payment.paymentMethod] || payment.paymentMethod}
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-500">
                  Лавлах: {payment.id}
                </p>
              </div>
              <div className="text-right">
                <p className="font-black tabular-nums text-emerald-700">
                  {formatMoney(payment.paidAmount)}
                </p>
                {payment.remainingDue !== null && (
                  <p className="mt-1 text-xs text-slate-500">
                    Төлөх үеийн үлдэгдэл: {formatMoney(payment.remainingDue)}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => onPrint(payment)}
                  className="mt-2 rounded-lg border px-3 py-2 text-xs font-bold text-blue-700"
                >
                  Баримт дахин хэвлэх
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {nextCursor && (
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            setRequest((previous) => ({
              cursor: nextCursor,
              refresh: previous.refresh + 1,
            }))
          }
          className="mt-4 w-full rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-50"
        >
          Өмнөх төлөлтүүдийг харах
        </button>
      )}
    </dialog>
  );
}
