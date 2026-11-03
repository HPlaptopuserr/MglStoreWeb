"use client";
import { useRef, useState } from "react";
import {
  calculateCashPayment,
  parseCashReceivedAmount,
  type CashPaymentDetails,
} from "@mgl/types";
import { ArrowRight, Loader2, Split } from "lucide-react";
import type { CheckoutPaymentEntry } from "./PosCheckoutView";
import {
  createSplitPaymentDraft,
  resolveSplitPaymentPlan,
  SPLIT_METHODS,
  SPLIT_PAYMENT_LABELS,
  type SplitPaymentMethod,
} from "../utils/split-payment-plan";
import { SplitPaymentRow } from "./SplitPaymentRow";
import { CashPaymentPanel } from "./CashPaymentPanel";
import type { PaymentFeedback } from "../types/payment-status.types";
import { formatMoney } from "../utils/pos-display-format";

interface Props {
  remaining: number;
  entries: CheckoutPaymentEntry[];
  disabled: boolean;
  feedback: PaymentFeedback;
  onCheckCard?: (id: string) => void;
  onCheckQr: (id: string) => void;
  onPay: (
    method: SplitPaymentMethod,
    amount: number,
    cash?: CashPaymentDetails,
  ) => void | Promise<void>;
}

export function SplitPaymentPlanner({
  remaining,
  entries,
  disabled,
  feedback,
  onCheckCard,
  onCheckQr,
  onPay,
}: Props) {
  const [draft, setDraft] = useState(createSplitPaymentDraft);
  const [cashReceived, setCashReceived] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const paid =
    entries
      .filter((entry) => entry.status === "confirmed")
      .reduce((sum, entry) => sum + Math.round(entry.amount * 100), 0) / 100;
  const total = Math.round((remaining + paid) * 100) / 100;
  const plan = resolveSplitPaymentPlan(total, draft, entries);
  const pending = entries.some((entry) => entry.status === "pending");
  const busy =
    disabled ||
    submitting ||
    pending ||
    Object.values(feedback).some((item) => item?.kind === "unknown");
  const method = plan.nextMethod;
  const received = cashReceived ?? String(plan.amounts.CASH);
  let cashPreview: ReturnType<typeof calculateCashPayment> | null = null;
  let cashError = "";
  if (method === "CASH") {
    try {
      cashPreview = calculateCashPayment(
        parseCashReceivedAmount(received),
        plan.amounts.CASH,
      );
      if (cashPreview.amount !== plan.amounts.CASH)
        cashError = "Авсан бэлэн мөнгө хуваарилсан дүнд хүрэхгүй байна.";
    } catch {
      cashError = "Авсан бэлэн мөнгөө зөв оруулна уу.";
    }
  }
  const pay = async () => {
    if (!method || plan.error || busy || inFlight.current || cashError) return;
    inFlight.current = true;
    setSubmitting(true);
    setError("");
    try {
      await onPay(
        method,
        plan.amounts[method],
        method === "CASH" ? cashPreview?.cash : undefined,
      );
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Төлбөрийг бүртгэж чадсангүй.",
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };
  return (
    <section
      aria-label="Хэсэгчилсэн төлбөрийн хуваарилалт"
      className="space-y-3"
    >
      <header className="rounded-xl bg-slate-900 px-4 py-3 text-white">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Split size={17} aria-hidden="true" />
          Хэсэгчилсэн төлбөр
        </h2>
        <div className="mt-2 flex items-end justify-between">
          <span className="text-xs text-slate-300">Нийт төлөх</span>
          <strong className="text-2xl tabular-nums">
            {formatMoney(total)}
          </strong>
        </div>
      </header>
      <p className="text-xs leading-5 text-slate-500">
        Нэг мөрөнд «Үлдэгдэл бүтнээр» сонгоод бусад дүнгээ оруулна.
      </p>
      <div className="space-y-2">
        {SPLIT_METHODS.map((row) => {
          const pendingEntry = entries.find(
            (entry) => entry.method === row && entry.status === "pending",
          );
          const checkStatus =
            pendingEntry && row === "QR"
              ? () => onCheckQr(pendingEntry.id)
              : pendingEntry?.attemptId && row === "CARD" && onCheckCard
                ? () => onCheckCard(pendingEntry.id)
                : undefined;
          return (
            <SplitPaymentRow
              key={row}
              method={row}
              value={draft.amounts[row]}
              amount={plan.amounts[row]}
              automatic={draft.remainderMethod === row}
              locked={plan.locked[row]}
              status={plan.statuses[row]}
              feedback={feedback[row]}
              onCheckStatus={checkStatus}
              checkDisabled={disabled || submitting}
              error={plan.errors[row]}
              disabled={busy}
              onChange={(value) => {
                setDraft((previous) => ({
                  ...previous,
                  amounts: { ...previous.amounts, [row]: value },
                }));
                setCashReceived(null);
              }}
              onModeChange={(automatic) => {
                setDraft((previous) => ({
                  amounts: {
                    ...previous.amounts,
                    ...(previous.remainderMethod
                      ? {
                          [previous.remainderMethod]: String(
                            plan.amounts[previous.remainderMethod],
                          ),
                        }
                      : {}),
                    [row]: String(plan.amounts[row]),
                  },
                  remainderMethod: automatic
                    ? row
                    : previous.remainderMethod === row
                      ? null
                      : previous.remainderMethod,
                }));
                setCashReceived(null);
              }}
            />
          );
        })}
      </div>
      <div
        role="status"
        aria-live="polite"
        className={`rounded-xl border p-3 text-xs leading-5 ${plan.error ? "border-amber-200 bg-amber-50 text-amber-900" : "border-blue-200 bg-blue-50 text-blue-800"}`}
      >
        <p className="flex justify-between gap-2 font-semibold">
          <span>Хуваарилсан</span>
          <span>
            {formatMoney(plan.allocated)} / {formatMoney(total)}
          </span>
        </p>
        {plan.error ? (
          <p className="mt-1">
            {plan.error}
            {plan.unallocated > 0
              ? ` Үлдсэн: ${formatMoney(plan.unallocated)}.`
              : ""}
          </p>
        ) : (
          <p className="mt-1">
            {pending
              ? "Банкны баталгаажилтыг хүлээж байна. Дахин төлбөр эхлүүлэхгүй."
              : method
                ? `Дараагийн төлбөр: ${SPLIT_PAYMENT_LABELS[method]} ${formatMoney(plan.amounts[method])}.`
                : "Бүх хэсэг бүртгэгдлээ. Борлуулалтаа батална уу."}
          </p>
        )}
      </div>
      {method === "CASH" && !plan.error && (
        <CashPaymentPanel
          remaining={plan.amounts.CASH}
          enteredAmount={received}
          cash={cashPreview?.cash}
          error={cashError}
          disabled={busy}
          onChange={setCashReceived}
        />
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700"
        >
          {error}
        </p>
      )}
      {method && (
        <button
          type="button"
          disabled={busy || Boolean(plan.error) || Boolean(cashError)}
          onClick={() => {
            void pay();
          }}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {submitting ? (
            <Loader2
              size={17}
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <ArrowRight size={17} aria-hidden="true" />
          )}
          {submitting
            ? "Боловсруулж байна…"
            : `${SPLIT_PAYMENT_LABELS[method]} ${formatMoney(plan.amounts[method])} ${method === "CASH" ? "бүртгэх" : "төлөх"}`}
        </button>
      )}
    </section>
  );
}
