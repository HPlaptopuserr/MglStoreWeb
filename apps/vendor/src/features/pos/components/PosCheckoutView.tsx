"use client";

import { useState } from "react";
import {
  ChevronRight,
  CheckCircle2,
  X,
  Banknote,
  CreditCard,
  HandCoins,
  QrCode,
  RefreshCw,
} from "lucide-react";
import type {
  CartLine,
  CartTotals,
  PosCreditBorrower,
  SaleCreditPaymentMeta,
} from "../types/pos.types";
import type { PaymentMethod } from "../constants/payment-methods";
import { CheckoutQPayPanel } from "./CheckoutQPayPanel";
import { CheckoutLoyaltyPanel } from "./CheckoutLoyaltyPanel";
import {
  PAYMENT_SHORTCUTS,
  paymentMethodForKey,
} from "../constants/payment-methods";
import { CreditPaymentDialog } from "./CreditPaymentDialog";
import { formatPosQuantity, type CashPaymentDetails } from "@mgl/types";
import { CashPaymentPanel } from "./CashPaymentPanel";
import { PaymentKeypad } from "./PaymentKeypad";
import { useCashPayment } from "../hooks/useCashPayment";

export type PosCheckoutProps = {
  lines: CartLine[];
  totals: CartTotals;
  paymentMethod: PaymentMethod;
  onChangeMethod: (m: PaymentMethod) => void;
  paymentEntries: CheckoutPaymentEntry[];
  qpayModal?: CheckoutQPayInvoice | null;
  statusMessage?: string;
  statusTone?: "idle" | "success" | "not-found";
  remaining: number;
  onAddPayment: (
    method: PaymentMethod,
    amount: number,
    credit?: SaleCreditPaymentMeta,
    cash?: CashPaymentDetails,
  ) => void | Promise<void>;
  onRequestQPay: (amount: number) => void | Promise<void>;
  onMarkQPayPaid: (id: string) => void;
  onRemovePayment: (id: string) => void | Promise<void>;
  onResetPayments: () => void | Promise<void>;
  onFinalize: () => void;
  onFinalizeCash: (
    amount: number,
    cash: CashPaymentDetails,
  ) => void | Promise<void>;
  canFinalize: boolean;
  onBack: () => void;
  onCancelCheckout: () => void | Promise<void>;
  disabled?: boolean;
  transactionId?: string;
  loyalty: CheckoutLoyaltyState;
  onLoyaltyChange: (next: CheckoutLoyaltyState) => void;
  onLookupLoyalty: () => void;
  loyaltyRedeemSession?: CheckoutLoyaltyRedeemSession | null;
  loyaltyRedeemLoading?: boolean;
  onRequestLoyaltyRedeemQr: (redeemPoints: number) => void | Promise<void>;
  onRefreshLoyaltyRedeemSession: () => void | Promise<void>;
  onClearLoyaltyRedeemSession: () => void;
  creditBorrowers?: PosCreditBorrower[];
  cashTenderEnabled?: boolean;
};

export type CheckoutPaymentEntry = {
  id: string;
  method: PaymentMethod;
  amount: number;
  status: "confirmed" | "pending";
  attemptId?: string;
  invoiceId?: string;
  transactionId?: string;
  credit?: SaleCreditPaymentMeta;
  cash?: CashPaymentDetails;
};

export type CheckoutQPayInvoice = {
  open: boolean;
  invoiceId: string;
  amount: number;
  qrText: string;
  qrImage: string;
  expiresAt: string;
};

export type CheckoutLoyaltyState = {
  mode: "NONE" | "EARN" | "REDEEM";
  phone: string;
  lookupLoading: boolean;
  lookupError: string;
  found: boolean;
  customerName?: string | null;
  balance: number;
  earnRate: number;
  membershipBadge: "NONE" | "STANDARD" | "MEMBER";
  redeemPoints: number;
};

export type CheckoutLoyaltyRedeemSession = {
  id: string;
  token: string;
  qrPayload: string;
  status: "PENDING" | "CONFIRMED" | "CONSUMED" | "EXPIRED" | "CANCELLED";
  phone: string;
  customerName?: string | null;
  balance: number;
  requestedPoints: number;
  saleTotal: number;
  expiresAt: string;
  confirmedAt?: string | null;
};

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Бэлэн" },
  { value: "CARD", label: "Карт" },
  { value: "QR", label: "QPay" },
  { value: "CREDIT", label: "Зээл" },
];

export function PosCheckoutView({
  lines,
  totals,
  paymentMethod,
  onChangeMethod,
  paymentEntries,
  qpayModal,
  statusMessage,
  statusTone = "idle",
  remaining,
  onAddPayment,
  onRequestQPay,
  onMarkQPayPaid,
  onRemovePayment,
  onResetPayments,
  onFinalize,
  onFinalizeCash,
  canFinalize,
  onBack,
  onCancelCheckout,
  disabled,
  transactionId = "",
  loyalty,
  onLoyaltyChange,
  onLookupLoyalty,
  loyaltyRedeemSession,
  loyaltyRedeemLoading = false,
  onRequestLoyaltyRedeemQr,
  onRefreshLoyaltyRedeemSession,
  onClearLoyaltyRedeemSession,
  creditBorrowers = [],
  cashTenderEnabled = true,
}: PosCheckoutProps) {
  const [enteredAmount, setEnteredAmount] = useState("");
  const [loyaltyPanelOpen, setLoyaltyPanelOpen] = useState(false);

  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [cancelCheckoutLoading, setCancelCheckoutLoading] = useState(false);

  const isCashTender = cashTenderEnabled && paymentMethod === "CASH";
  const cashPayment = useCashPayment(enteredAmount, remaining);
  const parsedAmount = parseFloat(enteredAmount.replace(/,/g, "")) || 0;
  const pendingTotal = paymentEntries
    .filter((item) => item.status === "pending")
    .reduce((sum, item) => sum + item.amount, 0);
  const hasConfirmedQPay = paymentEntries.some(
    (item) => item.method === "QR" && item.status === "confirmed",
  );
  const hasPendingQPay = paymentEntries.some(
    (item) => item.method === "QR" && item.status === "pending",
  );
  const hasCustomAmount = parsedAmount > 0;
  const paymentAmount = isCashTender
    ? (cashPayment.preview?.amount ?? 0)
    : hasCustomAmount
      ? Math.min(parsedAmount, Math.max(0, remaining))
      : Math.max(0, remaining);
  const previewRemaining = Math.max(0, remaining - paymentAmount);
  const maxRedeemPoints = Math.max(
    0,
    Math.min(loyalty.balance, totals.grandTotal),
  );
  const effectiveRedeemPoints =
    loyalty.mode === "REDEEM"
      ? Math.max(
          0,
          Math.min(
            maxRedeemPoints,
            Math.floor(Number(loyalty.redeemPoints) || 0),
          ),
        )
      : 0;
  const estimatedEarnPoints = Math.max(
    0,
    Math.floor(
      Math.max(0, totals.grandTotal - effectiveRedeemPoints) * loyalty.earnRate,
    ),
  );
  const projectedBalance =
    loyalty.mode === "EARN"
      ? loyalty.balance + estimatedEarnPoints
      : Math.max(0, loyalty.balance - effectiveRedeemPoints) +
        estimatedEarnPoints;

  const handleNumpad = (key: string) => {
    if (key === "⌫") {
      setEnteredAmount((prev) => prev.slice(0, -1));
      return;
    }
    if (key === ".") {
      if (!enteredAmount.includes(".")) {
        setEnteredAmount((prev) => (prev === "" ? "0." : prev + "."));
      }
      return;
    }
    setEnteredAmount((prev) => {
      const next = prev + key;
      if (parseFloat(next) > 999_999_999) return prev;
      return next;
    });
  };

  const runPaymentAction = (amount: number) => {
    if (isCashTender) {
      const preview = cashPayment.preview;
      if (!preview || disabled) return;
      void cashPayment.submit(async () => {
        await onAddPayment("CASH", preview.amount, undefined, preview.cash);
        setEnteredAmount("");
      });
      return;
    }
    if (paymentMethod === "CREDIT") {
      setCreditDialogOpen(true);
      return;
    }

    if (paymentMethod === "QR") {
      void onRequestQPay(amount);
    } else {
      void onAddPayment(paymentMethod, amount);
    }

    setEnteredAmount("");
  };

  const handlePrimaryAction = () => {
    const amount = paymentAmount;
    if (amount <= 0) return;

    if (isCashTender) {
      runPaymentAction(amount);
      return;
    }

    runPaymentAction(amount);
  };

  const confirmCreditPayment = (credit: SaleCreditPaymentMeta) => {
    void onAddPayment("CREDIT", credit.principal, credit);
    setCreditDialogOpen(false);
    setEnteredAmount("");
  };

  const handleCancelCheckout = async () => {
    if (cancelCheckoutLoading || disabled) return;
    setCancelCheckoutLoading(true);
    try {
      await onCancelCheckout();
    } finally {
      setCancelCheckoutLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Төлбөр тооцоо болон M Point"
      onKeyDown={(event) => {
        const method = paymentMethodForKey(event.key);
        if (
          method &&
          !disabled &&
          !paymentEntries.some((entry) => entry.status === "pending")
        ) {
          event.preventDefault();
          onChangeMethod(method);
          setEnteredAmount("");
        }
      }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden overscroll-contain bg-slate-50"
    >
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-300 px-6 py-3 shrink-0 max-[1500px]:px-4 max-[1500px]:py-2.5 [@media(max-height:850px)]:py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 max-[760px]:h-5 max-[760px]:w-5">
              <span className="text-[10px] font-black text-white">M</span>
            </div>
            <span className="text-sm font-bold text-slate-950 max-[760px]:text-xs">
              MGL POS
            </span>
          </div>
          <span className="text-slate-400">•</span>
          <span className="text-xs text-slate-600 max-[760px]:text-[10px]">
            Төлбөр тооцоо {transactionId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-500 max-[760px]:px-2.5 max-[760px]:py-1 max-[760px]:text-[10px]"
          >
            Сагс руу буцах
          </button>
          <button
            type="button"
            onClick={() => void handleCancelCheckout()}
            disabled={disabled || cancelCheckoutLoading}
            title="Гүйлгээ цуцалж, сагс цэвэрлэх"
            aria-label="Гүйлгээ цуцалж, сагс цэвэрлэх"
            className="rounded-md border border-rose-300 bg-white p-1.5 text-rose-600 transition-colors hover:border-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40 max-[760px]:p-1"
          >
            {cancelCheckoutLoading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <X size={14} />
            )}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Left: payment selector + numpad ── */}
        <div className="flex min-h-0 w-[360px] shrink-0 flex-col gap-2 overflow-y-auto overscroll-contain border-r border-slate-300 p-3 min-[1600px]:w-[400px] min-[1600px]:p-4">
          {/* Payment method tabs */}
          <div className="shrink-0">
            <p className="sr-only">Төлбөрийн хэлбэр</p>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_OPTIONS.map((opt) => {
                const isActive = paymentMethod === opt.value;
                const Icon =
                  opt.value === "CASH"
                    ? Banknote
                    : opt.value === "CARD"
                      ? CreditCard
                      : opt.value === "CREDIT"
                        ? HandCoins
                        : QrCode;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={
                      disabled ||
                      cashPayment.submitting ||
                      paymentEntries.some((entry) => entry.status === "pending")
                    }
                    aria-keyshortcuts={PAYMENT_SHORTCUTS[opt.value]}
                    aria-pressed={isActive}
                    onClick={() => {
                      setEnteredAmount("");
                      onChangeMethod(opt.value);
                    }}
                    className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-1 text-xs font-bold transition-colors ${
                      isActive
                        ? "border-blue-500 bg-blue-50 text-blue-800 shadow-sm"
                        : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-slate-700"
                    }`}
                  >
                    <Icon size={16} />
                    {opt.label}
                    <kbd className="text-[10px] font-semibold text-slate-600">
                      {PAYMENT_SHORTCUTS[opt.value]}
                    </kbd>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount entry display */}
          {isCashTender ? (
            <CashPaymentPanel
              remaining={remaining}
              enteredAmount={enteredAmount}
              cash={cashPayment.preview?.cash}
              error={cashPayment.error}
              disabled={disabled || cashPayment.submitting}
              onChange={setEnteredAmount}
            />
          ) : (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">
                Төлөх дүн
              </p>
              <div
                className={`rounded-xl border px-4 py-3 transition max-[1500px]:px-3 max-[1500px]:py-2 [@media(max-height:850px)]:py-2 ${
                  hasCustomAmount
                    ? "border-amber-500/70 bg-blue-600/10"
                    : "border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-base font-bold text-slate-600">₮</span>
                  <span className="text-3xl font-black tabular-nums text-slate-950 max-[1500px]:text-2xl max-[1180px]:text-xl">
                    {paymentAmount.toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-right text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  {hasCustomAmount ? "Хэсэгчилсэн төлөлт" : "Үлдэгдэл бүтнээр"}
                </p>
              </div>
              <p className="mt-2 text-xs text-slate-600 max-[1280px]:text-[11px]">
                Үлдэгдэл: ₮{remaining.toLocaleString()} • Төлсний дараа: ₮
                {previewRemaining.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-600 max-[1280px]:text-[10px]">
                Хэсэгчлэн төлөх үед доорх товчлуураар дүнгээ өөрчилнө.
              </p>
            </div>
          )}

          {
            <button
              type="button"
              onClick={() => {
                setLoyaltyPanelOpen(true);
              }}
              disabled={disabled || cashPayment.submitting}
              className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"
            >
              M Point ашиглах (заавал биш)
            </button>
          }
          <div className="grid shrink-0 grid-cols-2 gap-2">
            {(!isCashTender ||
              (cashPayment.preview &&
                cashPayment.preview.amount < remaining)) && (
              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={
                  disabled ||
                  cashPayment.submitting ||
                  remaining <= 0 ||
                  (isCashTender && !cashPayment.preview)
                }
                className="rounded-xl bg-blue-600 px-3 py-3 text-xs font-black text-white hover:bg-blue-500 disabled:opacity-40 max-[1500px]:py-2.5 max-[1180px]:text-[11px] [@media(max-height:850px)]:py-2"
              >
                {cashPayment.submitting
                  ? "Бүртгэж байна…"
                  : isCashTender
                    ? "Хэсэгчилсэн төлбөр нэмэх"
                    : paymentMethod === "QR"
                      ? `QPay ₮${paymentAmount.toLocaleString()}`
                      : `${PAYMENT_OPTIONS.find((item) => item.value === paymentMethod)?.label || "Төлбөр"} ₮${paymentAmount.toLocaleString()}`}
              </button>
            )}
            {paymentEntries.length > 0 && (
              <button
                type="button"
                onClick={() => void onResetPayments()}
                disabled={
                  disabled || paymentEntries.length === 0 || hasConfirmedQPay
                }
                className="rounded-xl border border-slate-300 px-3 py-3 text-xs font-bold text-slate-700 hover:border-blue-500 disabled:opacity-40 max-[1500px]:py-2.5 max-[1180px]:text-[11px] [@media(max-height:850px)]:py-2"
              >
                Төлбөрүүд цэвэрлэх
              </button>
            )}
          </div>

          <PaymentKeypad
            tone="light"
            disabled={disabled || cashPayment.submitting}
            onKey={handleNumpad}
            onAmount={setEnteredAmount}
          />
          {pendingTotal > 0 && (
            <p
              role="status"
              className="shrink-0 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800"
            >
              Хүлээгдэж буй QPay: ₮{pendingTotal.toLocaleString()}
            </p>
          )}
        </div>

        {/* ── Right: order summary ── */}
        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-6 max-[1500px]:gap-3 max-[1500px]:p-4 max-[1180px]:gap-2.5 max-[1180px]:p-3 [@media(max-height:850px)]:gap-2.5 [@media(max-height:850px)]:p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 shrink-0">
            Захиалгын жагсаалт
          </p>

          {/* Scrollable item list */}
          <div className="flex-1 overflow-y-auto overscroll-contain space-y-2 pr-1">
            {lines.map((line) => (
              <div
                key={line.productId}
                className="flex items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 max-[1280px]:px-3 max-[1280px]:py-2.5"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-semibold text-slate-950 truncate">
                    {line.name}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {formatPosQuantity(line.qty, line.measureUnit)} × ₮
                    {line.unitPrice.toLocaleString()}
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-800 tabular-nums shrink-0">
                  ₮{(line.qty * line.unitPrice).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {(qpayModal?.open || hasPendingQPay) && (
            <CheckoutQPayPanel
              invoice={qpayModal}
              pendingId={
                paymentEntries.find(
                  (entry) =>
                    entry.method === "QR" && entry.status === "pending",
                )?.invoiceId
              }
              busy={Boolean(disabled)}
              onCheck={onMarkQPayPaid}
              onCancel={() => {
                const pending = paymentEntries.find(
                  (entry) =>
                    entry.method === "QR" && entry.status === "pending",
                );
                if (pending) void onRemovePayment(pending.id);
              }}
            />
          )}

          {!qpayModal?.open && statusMessage && statusTone === "not-found" && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700">
                {hasPendingQPay
                  ? "QPay төлбөрийн анхааруулга"
                  : paymentMethod === "CARD"
                    ? "Картын төлбөр амжилтгүй"
                    : paymentMethod === "QR"
                      ? "QPay QR үүссэнгүй"
                      : "Төлбөр амжилтгүй"}
              </p>
              <p className="mt-2 text-sm font-semibold text-rose-800">
                {statusMessage}
              </p>
              {hasPendingQPay && (
                <button
                  type="button"
                  onClick={() => void handleCancelCheckout()}
                  disabled={disabled || cancelCheckoutLoading}
                  className="mt-4 inline-flex items-center justify-center rounded-lg border border-rose-400/50 bg-rose-500/15 px-4 py-2 text-xs font-black text-rose-800 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {cancelCheckoutLoading
                    ? "Цуцалж байна..."
                    : "Гүйлгээ цуцалж, сагс цэвэрлэх"}
                </button>
              )}
            </div>
          )}

          {hasConfirmedQPay && (
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 shrink-0 text-emerald-700"
                  size={20}
                />
                <div>
                  <p className="text-sm font-black text-emerald-800">
                    QPay төлбөр хүлээн авлаа
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-emerald-800">
                    {remaining <= 0
                      ? "Борлуулалтыг дуусгахын тулд “Гүйлгээ батлах” товчийг дарна уу."
                      : `Үлдэгдэл ₮${remaining.toLocaleString()} төлбөрөө гүйцээгээд “Гүйлгээ батлах” товчийг дарна уу.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="max-h-44 space-y-2 overflow-y-auto rounded-2xl border border-slate-300 bg-white/70 p-4 max-[1500px]:max-h-32 max-[1500px]:p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
              Төлбөрийн мөрүүд
            </p>
            {paymentEntries.length === 0 ? (
              <p className="text-xs text-slate-600">
                Одоогоор төлбөр нэмээгүй байна.
              </p>
            ) : (
              paymentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-700">
                      {entry.method === "CREDIT" && entry.credit
                        ? `Зээл • ${entry.credit.borrowerName}${entry.credit.employeeName ? ` • ${entry.credit.employeeName}` : ""} • ₮${entry.amount.toLocaleString()}`
                        : `${entry.method} • ₮${entry.amount.toLocaleString()}`}
                    </p>
                    {entry.cash && (
                      <p className="text-xs text-emerald-700">
                        Авсан:{" "}
                        {entry.cash.receivedAmount.toLocaleString("mn-MN")} ₮ ·
                        Хариулт:{" "}
                        {entry.cash.changeAmount.toLocaleString("mn-MN")} ₮
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      {entry.status === "pending" && entry.method === "QR" ? (
                        <button
                          type="button"
                          onClick={() => onMarkQPayPaid(entry.id)}
                          className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-500"
                        >
                          Төлөв шалгах
                        </button>
                      ) : entry.status === "pending" ? (
                        <span className="text-[10px] font-bold text-blue-600">
                          Хүлээгдэж байна
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700">
                          Баталгаажсан
                        </span>
                      )}
                      {!(
                        entry.method === "QR" && entry.status === "confirmed"
                      ) && (
                        <button
                          type="button"
                          onClick={() => void onRemovePayment(entry.id)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-[10px] font-bold text-slate-600 hover:border-blue-500"
                        >
                          {entry.method === "QR" ? "QR цуцлах" : "Устгах"}
                        </button>
                      )}
                    </div>
                  </div>
                  {entry.invoiceId && (
                    <p className="mt-1 break-all text-[10px] text-slate-600">
                      Төлбөрийн лавлах: {entry.invoiceId}
                    </p>
                  )}
                  {entry.transactionId && (
                    <p className="mt-1 text-[10px] text-slate-600">
                      Txn: {entry.transactionId}
                    </p>
                  )}
                  {entry.credit && (
                    <p className="mt-1 text-[10px] text-slate-600">
                      Хүү: ₮{entry.credit.totalInterest.toLocaleString()} •
                      Нийт: ₮{entry.credit.totalDue.toLocaleString()} •{" "}
                      {entry.credit.termMonths} сар
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Totals card */}
          <div className="shrink-0 space-y-2.5 rounded-2xl border border-slate-300 bg-white px-6 py-5 max-[1500px]:space-y-2 max-[1500px]:px-4 max-[1500px]:py-4 [@media(max-height:850px)]:py-3">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Дүн</span>
              <span className="tabular-nums">
                ₮{totals.subTotal.toLocaleString()}
              </span>
            </div>
            {totals.taxTotal > 0 && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>НӨАТ</span>
                <span className="tabular-nums">
                  ₮{totals.taxTotal.toLocaleString()}
                </span>
              </div>
            )}
            {totals.discountTotal > 0 && (
              <div className="flex justify-between text-sm text-emerald-700">
                <span>Хөнгөлөлт</span>
                <span className="tabular-nums">
                  -₮{totals.discountTotal.toLocaleString()}
                </span>
              </div>
            )}
            <div className="pt-4 border-t border-slate-300">
              <p className="text-[10px] uppercase tracking-widest text-slate-600">
                Нийт төлөх дүн
              </p>
              <p className="mt-1 text-5xl font-black leading-none tabular-nums text-blue-600 max-[1500px]:text-4xl [@media(max-height:850px)]:text-3xl">
                ₮{totals.grandTotal.toLocaleString()}
              </p>
              <p className="mt-2 text-xs font-semibold text-slate-600 max-[1280px]:text-[11px]">
                Төлбөр баталгаажсан: ₮
                {paymentEntries
                  .filter((entry) => entry.status === "confirmed")
                  .reduce((sum, entry) => sum + entry.amount, 0)
                  .toLocaleString()}{" "}
                • Үлдэгдэл: ₮{remaining.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (canFinalize) {
                  onFinalize();
                  return;
                }
                const preview = cashPayment.preview;
                if (!isCashTender || !preview || preview.amount < remaining)
                  return;
                void cashPayment.submit(() =>
                  onFinalizeCash(preview.amount, preview.cash),
                );
              }}
              disabled={
                disabled ||
                cashPayment.submitting ||
                (!canFinalize &&
                  !(
                    isCashTender &&
                    cashPayment.preview &&
                    cashPayment.preview.amount >= remaining &&
                    remaining > 0 &&
                    !paymentEntries.some((entry) => entry.status === "pending")
                  ))
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-base font-black text-white shadow-lg shadow-blue-200/30 transition-colors hover:bg-blue-500 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 max-[1500px]:py-3 max-[1500px]:text-sm [@media(max-height:850px)]:py-2.5"
            >
              Гүйлгээ батлах
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={onBack}
              disabled={hasConfirmedQPay}
              className="w-full rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-blue-500 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 max-[1500px]:py-2.5 max-[1500px]:text-xs [@media(max-height:850px)]:py-2"
            >
              ← Кассанд буцах
            </button>
          </div>
        </div>
      </div>

      {loyaltyPanelOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="M Point popup хаах"
            onClick={() => setLoyaltyPanelOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-300 bg-slate-50 p-5 shadow-2xl shadow-black/60 max-[760px]:max-h-[calc(100dvh-1rem)] max-[760px]:rounded-2xl max-[760px]:p-3">
            <button
              type="button"
              onClick={() => setLoyaltyPanelOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-full border border-slate-300 bg-white p-2 text-slate-600 transition hover:border-blue-500 hover:text-slate-950 max-[760px]:right-3 max-[760px]:top-3"
              aria-label="M Point popup хаах"
            >
              <X size={18} />
            </button>
            <CheckoutLoyaltyPanel
              loyalty={loyalty}
              onLoyaltyChange={onLoyaltyChange}
              onLookupLoyalty={onLookupLoyalty}
              onContinue={() => setLoyaltyPanelOpen(false)}
              loyaltyRedeemSession={loyaltyRedeemSession}
              loyaltyRedeemLoading={loyaltyRedeemLoading}
              onRequestLoyaltyRedeemQr={onRequestLoyaltyRedeemQr}
              onRefreshLoyaltyRedeemSession={onRefreshLoyaltyRedeemSession}
              onClearLoyaltyRedeemSession={onClearLoyaltyRedeemSession}
              statusMessage={statusMessage}
              statusTone={statusTone}
              disabled={disabled}
              estimatedEarnPoints={estimatedEarnPoints}
              maxRedeemPoints={maxRedeemPoints}
              effectiveRedeemPoints={effectiveRedeemPoints}
              projectedBalance={projectedBalance}
            />
          </div>
        </div>
      )}

      {creditDialogOpen && (
        <CreditPaymentDialog
          amount={paymentAmount}
          borrowers={creditBorrowers}
          onClose={() => setCreditDialogOpen(false)}
          onConfirm={confirmCreditPayment}
        />
      )}
    </div>
  );
}
