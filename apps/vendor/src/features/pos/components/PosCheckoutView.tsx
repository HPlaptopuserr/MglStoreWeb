"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ChevronRight,
  Clock,
  Settings,
  X,
  Banknote,
  CreditCard,
  HandCoins,
  QrCode,
  Gift,
  Search,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import type {
  CartLine,
  CartTotals,
  PosCreditBorrower,
  SaleCreditPaymentMeta,
} from "../types/pos.types";
import type { PaymentMethod } from "../constants/payment-methods";
import { CreditPaymentDialog } from "./CreditPaymentDialog";
import { formatPosQuantity, type CashPaymentDetails } from "@mgl/types";
import { CashPaymentPanel } from "./CashPaymentPanel";
import { PaymentKeypad } from "./PaymentKeypad";
import { useCashPayment } from "../hooks/useCashPayment";

type Props = {
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
  transactionId = "TXN-0001",
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
}: Props) {
  const [enteredAmount, setEnteredAmount] = useState("");
  const [loyaltyPanelOpen, setLoyaltyPanelOpen] = useState(false);
  const [loyaltyPromptSeen, setLoyaltyPromptSeen] = useState(false);
  const [loyaltyPromptStep, setLoyaltyPromptStep] = useState<
    "ASK" | "REGISTERED"
  >("ASK");
  const [pendingPaymentAmount, setPendingPaymentAmount] = useState(0);
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

    if (!loyaltyPromptSeen) {
      setLoyaltyPromptStep("ASK");
      setPendingPaymentAmount(amount);
      setLoyaltyPanelOpen(true);
      return;
    }

    runPaymentAction(amount);
  };

  const continuePendingPayment = () => {
    const amount =
      loyalty.mode === "REDEEM"
        ? paymentAmount
        : pendingPaymentAmount || paymentAmount;
    setLoyaltyPromptSeen(true);
    setLoyaltyPanelOpen(false);
    setPendingPaymentAmount(0);
    // Loyalty can alter payable amount. Cash requires a fresh explicit confirmation.
    if (amount > 0 && !isCashTender) runPaymentAction(amount);
  };

  const continueWithRegisteredLoyalty = () => {
    onLoyaltyChange({
      ...loyalty,
      mode: loyalty.mode === "NONE" ? "EARN" : loyalty.mode,
      redeemPoints: loyalty.mode === "REDEEM" ? loyalty.redeemPoints : 0,
    });
    setLoyaltyPromptStep("REGISTERED");
  };

  const continueWithoutLoyalty = () => {
    onLoyaltyChange({ ...loyalty, mode: "NONE", redeemPoints: 0 });
    continuePendingPayment();
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
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden overscroll-contain bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-3 shrink-0 max-[1500px]:px-4 max-[1500px]:py-2.5 [@media(max-height:850px)]:py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-500 max-[760px]:h-5 max-[760px]:w-5">
              <span className="text-[10px] font-black text-black">M</span>
            </div>
            <span className="text-sm font-bold text-white max-[760px]:text-xs">
              MGL POS
            </span>
          </div>
          <span className="text-zinc-700">•</span>
          <span className="text-xs text-zinc-500 max-[760px]:text-[10px]">
            Checkout: {transactionId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-500 max-[760px]:px-2.5 max-[760px]:py-1 max-[760px]:text-[10px]"
          >
            Сагс руу буцах
          </button>
          <button
            type="button"
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:border-zinc-600 max-[760px]:px-2.5 max-[760px]:py-1 max-[760px]:text-[10px]"
          >
            <Clock size={12} className="inline mr-1" />
            HISTORY
          </button>
          <button
            type="button"
            className="rounded-md border border-zinc-700 p-1.5 text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-300 max-[760px]:p-1"
          >
            <Settings size={14} />
          </button>
          <button
            type="button"
            onClick={() => void handleCancelCheckout()}
            disabled={disabled || cancelCheckoutLoading}
            title="Гүйлгээ цуцалж, сагс цэвэрлэх"
            aria-label="Гүйлгээ цуцалж, сагс цэвэрлэх"
            className="rounded-md border border-rose-900/70 p-1.5 text-rose-400 transition-colors hover:border-rose-600 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40 max-[760px]:p-1"
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
        <div className="flex min-h-0 w-[360px] shrink-0 flex-col gap-2 overflow-y-auto overscroll-contain border-r border-zinc-800 p-3 min-[1600px]:w-[400px] min-[1600px]:p-4">
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
                    onClick={() => {
                      setEnteredAmount("");
                      onChangeMethod(opt.value);
                    }}
                    disabled={disabled || cashPayment.submitting}
                    className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-1 text-xs font-bold transition-colors ${
                      isActive
                        ? "bg-zinc-100 text-zinc-900 border-zinc-100 shadow-lg shadow-zinc-900"
                        : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300"
                    }`}
                  >
                    <Icon size={16} />
                    {opt.label}
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
                Төлөх дүн
              </p>
              <div
                className={`rounded-xl border px-4 py-3 transition max-[1500px]:px-3 max-[1500px]:py-2 [@media(max-height:850px)]:py-2 ${
                  hasCustomAmount
                    ? "border-amber-500/70 bg-amber-500/10"
                    : "border-zinc-700 bg-zinc-900"
                }`}
              >
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-base font-bold text-zinc-500">₮</span>
                  <span className="text-3xl font-black tabular-nums text-white max-[1500px]:text-2xl max-[1180px]:text-xl">
                    {paymentAmount.toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  {hasCustomAmount ? "Хэсэгчилсэн төлөлт" : "Үлдэгдэл бүтнээр"}
                </p>
              </div>
              <p className="mt-2 text-xs text-zinc-500 max-[1280px]:text-[11px]">
                Үлдэгдэл: ₮{remaining.toLocaleString()} • Төлсний дараа: ₮
                {previewRemaining.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-zinc-600 max-[1280px]:text-[10px]">
                Хэсэгчлэн төлөх үед доорх товчлуураар дүнгээ өөрчилнө.
              </p>
            </div>
          )}

          {isCashTender && (
            <button
              type="button"
              onClick={() => {
                setLoyaltyPromptStep("ASK");
                setLoyaltyPanelOpen(true);
              }}
              disabled={disabled || cashPayment.submitting}
              className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              M Point ашиглах (заавал биш)
            </button>
          )}
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
                className="rounded-xl bg-amber-500 px-3 py-3 text-xs font-black text-black hover:bg-amber-400 disabled:opacity-40 max-[1500px]:py-2.5 max-[1180px]:text-[11px] [@media(max-height:850px)]:py-2"
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
                className="rounded-xl border border-zinc-700 px-3 py-3 text-xs font-bold text-zinc-300 hover:border-zinc-500 disabled:opacity-40 max-[1500px]:py-2.5 max-[1180px]:text-[11px] [@media(max-height:850px)]:py-2"
              >
                Төлбөрүүд цэвэрлэх
              </button>
            )}
          </div>

          <PaymentKeypad
            disabled={disabled || cashPayment.submitting}
            onKey={handleNumpad}
            onAmount={setEnteredAmount}
          />
          {pendingTotal > 0 && (
            <p
              role="status"
              className="shrink-0 rounded-xl border border-amber-800 bg-amber-950 px-3 py-2 text-xs text-amber-200"
            >
              Хүлээгдэж буй QPay: ₮{pendingTotal.toLocaleString()}
            </p>
          )}
        </div>

        {/* ── Right: order summary ── */}
        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-6 max-[1500px]:gap-3 max-[1500px]:p-4 max-[1180px]:gap-2.5 max-[1180px]:p-3 [@media(max-height:850px)]:gap-2.5 [@media(max-height:850px)]:p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 shrink-0">
            Захиалгын жагсаалт
          </p>

          {/* Scrollable item list */}
          <div className="flex-1 overflow-y-auto overscroll-contain space-y-2 pr-1">
            {lines.map((line) => (
              <div
                key={line.productId}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 max-[1280px]:px-3 max-[1280px]:py-2.5"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-semibold text-white truncate">
                    {line.name}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {formatPosQuantity(line.qty, line.measureUnit)} × ₮
                    {line.unitPrice.toLocaleString()}
                  </p>
                </div>
                <p className="text-sm font-bold text-zinc-200 tabular-nums shrink-0">
                  ₮{(line.qty * line.unitPrice).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {qpayModal?.open && (qpayModal.qrImage || qpayModal.qrText) && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex flex-col items-center gap-4 xl:flex-row xl:items-center">
                <div className="flex h-72 w-72 shrink-0 items-center justify-center rounded-xl bg-white p-3 shadow-lg shadow-black/30">
                  {qpayModal.qrImage ? (
                    <img
                      src={`data:image/png;base64,${qpayModal.qrImage}`}
                      alt="QPay QR"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <QRCodeSVG
                      value={qpayModal.qrText}
                      size={260}
                      level="L"
                      bgColor="#ffffff"
                      fgColor="#000000"
                      includeMargin
                    />
                  )}
                </div>
                <div className="min-w-0 text-center xl:text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                    QPay QR
                  </p>
                  <p className="mt-1 text-3xl font-black text-amber-400">
                    ₮{qpayModal.amount.toLocaleString()}
                  </p>
                  <p className="mt-2 break-all font-mono text-[10px] text-zinc-500">
                    {qpayModal.invoiceId}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-zinc-400">
                    Дуусах:{" "}
                    {new Date(qpayModal.expiresAt).toLocaleTimeString("mn-MN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!qpayModal?.open && statusMessage && statusTone === "not-found" && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-300">
                {paymentMethod === "CARD"
                  ? "Картын төлбөр амжилтгүй"
                  : paymentMethod === "QR"
                    ? "QPay QR үүссэнгүй"
                    : "Төлбөр амжилтгүй"}
              </p>
              <p className="mt-2 text-sm font-semibold text-rose-100">
                {statusMessage}
              </p>
            </div>
          )}

          {hasConfirmedQPay && (
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 shrink-0 text-emerald-300"
                  size={20}
                />
                <div>
                  <p className="text-sm font-black text-emerald-200">
                    QPay төлбөр хүлээн авлаа
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-emerald-100/80">
                    {remaining <= 0
                      ? "Борлуулалтыг дуусгахын тулд “Гүйлгээ батлах” товчийг дарна уу."
                      : `Үлдэгдэл ₮${remaining.toLocaleString()} төлбөрөө гүйцээгээд “Гүйлгээ батлах” товчийг дарна уу.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="max-h-44 space-y-2 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 max-[1500px]:max-h-32 max-[1500px]:p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Төлбөрийн мөрүүд
            </p>
            {paymentEntries.length === 0 ? (
              <p className="text-xs text-zinc-500">
                Одоогоор төлбөр нэмээгүй байна.
              </p>
            ) : (
              paymentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-zinc-300">
                      {entry.method === "CREDIT" && entry.credit
                        ? `Зээл • ${entry.credit.borrowerName}${entry.credit.employeeName ? ` • ${entry.credit.employeeName}` : ""} • ₮${entry.amount.toLocaleString()}`
                        : `${entry.method} • ₮${entry.amount.toLocaleString()}`}
                    </p>
                    {entry.cash && (
                      <p className="text-xs text-emerald-300">
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
                        <span className="text-[10px] font-bold text-amber-400">
                          Хүлээгдэж байна
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400">
                          Баталгаажсан
                        </span>
                      )}
                      {!(
                        entry.method === "QR" && entry.status === "confirmed"
                      ) && (
                        <button
                          type="button"
                          onClick={() => void onRemovePayment(entry.id)}
                          className="rounded-md border border-zinc-700 px-2 py-1 text-[10px] font-bold text-zinc-400 hover:border-zinc-500"
                        >
                          {entry.method === "QR" ? "QR цуцлах" : "Устгах"}
                        </button>
                      )}
                    </div>
                  </div>
                  {entry.invoiceId && (
                    <p className="mt-1 break-all text-[10px] text-zinc-500">
                      Төлбөрийн лавлах: {entry.invoiceId}
                    </p>
                  )}
                  {entry.transactionId && (
                    <p className="mt-1 text-[10px] text-zinc-500">
                      Txn: {entry.transactionId}
                    </p>
                  )}
                  {entry.credit && (
                    <p className="mt-1 text-[10px] text-zinc-500">
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
          <div className="shrink-0 space-y-2.5 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-5 max-[1500px]:space-y-2 max-[1500px]:px-4 max-[1500px]:py-4 [@media(max-height:850px)]:py-3">
            <div className="flex justify-between text-sm text-zinc-500">
              <span>Дүн</span>
              <span className="tabular-nums">
                ₮{totals.subTotal.toLocaleString()}
              </span>
            </div>
            {totals.taxTotal > 0 && (
              <div className="flex justify-between text-sm text-zinc-500">
                <span>НӨАТ</span>
                <span className="tabular-nums">
                  ₮{totals.taxTotal.toLocaleString()}
                </span>
              </div>
            )}
            {totals.discountTotal > 0 && (
              <div className="flex justify-between text-sm text-emerald-400">
                <span>Хөнгөлөлт</span>
                <span className="tabular-nums">
                  -₮{totals.discountTotal.toLocaleString()}
                </span>
              </div>
            )}
            <div className="pt-4 border-t border-zinc-700">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600">
                Нийт төлөх дүн
              </p>
              <p className="mt-1 text-5xl font-black leading-none tabular-nums text-amber-400 max-[1500px]:text-4xl [@media(max-height:850px)]:text-3xl">
                ₮{totals.grandTotal.toLocaleString()}
              </p>
              <p className="mt-2 text-xs font-semibold text-zinc-400 max-[1280px]:text-[11px]">
                Төлсөн: ₮{(totals.grandTotal - remaining).toLocaleString()} •
                Үлдэгдэл: ₮{remaining.toLocaleString()}
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-4 text-base font-black text-black shadow-lg shadow-amber-900/30 transition-colors hover:bg-amber-400 active:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40 max-[1500px]:py-3 max-[1500px]:text-sm [@media(max-height:850px)]:py-2.5"
            >
              Гүйлгээ батлах
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={onBack}
              disabled={hasConfirmedQPay}
              className="w-full rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 max-[1500px]:py-2.5 max-[1500px]:text-xs [@media(max-height:850px)]:py-2"
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
          <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/60 max-[760px]:max-h-[calc(100dvh-1rem)] max-[760px]:rounded-2xl max-[760px]:p-3">
            <button
              type="button"
              onClick={() => setLoyaltyPanelOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-full border border-zinc-700 bg-zinc-900 p-2 text-zinc-400 transition hover:border-zinc-500 hover:text-white max-[760px]:right-3 max-[760px]:top-3"
              aria-label="M Point popup хаах"
            >
              <X size={18} />
            </button>
            {loyaltyPromptStep === "ASK" ? (
              <LoyaltyRegistrationPrompt
                onRegistered={continueWithRegisteredLoyalty}
                onUnregistered={continueWithoutLoyalty}
              />
            ) : (
              <LoyaltyPanel
                loyalty={loyalty}
                onLoyaltyChange={onLoyaltyChange}
                onLookupLoyalty={onLookupLoyalty}
                onContinue={continuePendingPayment}
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
            )}
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

function LoyaltyRegistrationPrompt({
  onRegistered,
  onUnregistered,
}: {
  onRegistered: () => void;
  onUnregistered: () => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 max-[760px]:p-4">
      <div className="flex items-start gap-3 pr-12">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300 max-[760px]:h-10 max-[760px]:w-10">
          <Gift size={22} />
        </span>
        <div className="min-w-0">
          <p className="text-xl font-black text-white max-[760px]:text-lg">
            M Point бүртгэлтэй юу?
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-zinc-500 max-[760px]:text-xs max-[760px]:leading-5">
            Бүртгэлтэй бол дугаараа шалгаад point цуглуулах эсвэл хасуулах
            сонголтоо батална. Бүртгэлгүй бол M Point ашиглахгүйгээр төлбөр
            үргэлжилнэ.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 min-[640px]:grid-cols-2 max-[760px]:mt-4">
        <button
          type="button"
          onClick={onRegistered}
          className="rounded-2xl bg-amber-500 px-5 py-4 text-sm font-black text-black transition hover:bg-amber-400 max-[760px]:py-3"
        >
          Бүртгэлтэй
        </button>
        <button
          type="button"
          onClick={onUnregistered}
          className="rounded-2xl border border-zinc-700 bg-zinc-950 px-5 py-4 text-sm font-black text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900 max-[760px]:py-3"
        >
          Бүртгэлгүй, үргэлжлүүлэх
        </button>
      </div>
    </div>
  );
}

function LoyaltyPanel({
  disabled,
  effectiveRedeemPoints,
  estimatedEarnPoints,
  loyalty,
  loyaltyRedeemLoading,
  loyaltyRedeemSession,
  maxRedeemPoints,
  onContinue,
  onClearLoyaltyRedeemSession,
  onLookupLoyalty,
  onLoyaltyChange,
  onRefreshLoyaltyRedeemSession,
  onRequestLoyaltyRedeemQr,
  projectedBalance,
  statusMessage,
  statusTone = "idle",
}: {
  disabled?: boolean;
  effectiveRedeemPoints: number;
  estimatedEarnPoints: number;
  loyalty: CheckoutLoyaltyState;
  loyaltyRedeemLoading: boolean;
  loyaltyRedeemSession?: CheckoutLoyaltyRedeemSession | null;
  maxRedeemPoints: number;
  onContinue: () => void;
  onClearLoyaltyRedeemSession: () => void;
  onLookupLoyalty: () => void;
  onLoyaltyChange: (next: CheckoutLoyaltyState) => void;
  onRefreshLoyaltyRedeemSession: () => void | Promise<void>;
  onRequestLoyaltyRedeemQr: (redeemPoints: number) => void | Promise<void>;
  projectedBalance: number;
  statusMessage?: string;
  statusTone?: "idle" | "success" | "not-found";
}) {
  const requiresPhone = loyalty.mode !== "NONE";
  const phoneReady = loyalty.phone.replace(/\D/g, "").length >= 6;
  const redeemConfirmed =
    loyalty.mode !== "REDEEM" ||
    (loyaltyRedeemSession?.status === "CONFIRMED" &&
      loyaltyRedeemSession.requestedPoints === effectiveRedeemPoints);
  const canContinue =
    !disabled &&
    !loyalty.lookupLoading &&
    (!requiresPhone || (phoneReady && loyalty.found && redeemConfirmed));

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 max-[760px]:p-3">
      <div className="flex items-start justify-between gap-3 pr-12">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300 max-[760px]:h-10 max-[760px]:w-10">
            <Gift size={22} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-white max-[760px]:text-base">
              M Point урамшуулал
            </p>
            <p className="line-clamp-1 text-sm font-semibold text-zinc-500 max-[760px]:text-xs">
              {(loyalty.earnRate * 100).toLocaleString("mn-MN", {
                maximumFractionDigits: 2,
              })}
              % буцаан олголт
            </p>
          </div>
        </div>
        {loyalty.membershipBadge !== "NONE" && (
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${
              loyalty.membershipBadge === "MEMBER"
                ? "bg-emerald-400/15 text-emerald-300"
                : "bg-zinc-800 text-zinc-300"
            }`}
          >
            {loyalty.membershipBadge === "MEMBER" ? "Гишүүн" : "Стандарт"}
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-3 min-[760px]:grid-cols-[minmax(0,1fr)_148px]">
        <input
          value={loyalty.phone}
          onChange={(event) => {
            onClearLoyaltyRedeemSession();
            onLoyaltyChange({
              ...loyalty,
              phone: event.target.value.replace(/\D/g, "").slice(0, 12),
              lookupError: "",
              found: false,
              customerName: null,
              balance: 0,
              membershipBadge: "NONE",
              redeemPoints: 0,
            });
          }}
          placeholder="Хэрэглэгчийн утас"
          className="h-12 min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-base font-bold text-white outline-none transition focus:border-amber-400 max-[760px]:h-11 max-[760px]:text-sm"
        />
        <button
          type="button"
          onClick={onLookupLoyalty}
          disabled={
            disabled ||
            loyalty.lookupLoading ||
            loyalty.phone.replace(/\D/g, "").length < 6
          }
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 text-sm font-black text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40 max-[760px]:h-11 max-[760px]:text-xs"
        >
          <Search size={16} />
          Шалгах
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 rounded-xl bg-zinc-950 p-1 text-sm font-black text-zinc-500 max-[760px]:text-xs">
        {[
          { key: "EARN", label: "Цуглуулах" },
          { key: "REDEEM", label: "Хасуулах" },
          { key: "NONE", label: "Алгасах" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              const nextMode = item.key as CheckoutLoyaltyState["mode"];
              const nextRedeemPoints =
                nextMode === "REDEEM"
                  ? Math.max(
                      0,
                      Math.min(
                        maxRedeemPoints,
                        loyalty.redeemPoints || maxRedeemPoints,
                      ),
                    )
                  : 0;
              if (nextMode !== "REDEEM") {
                onClearLoyaltyRedeemSession();
              }
              onLoyaltyChange({
                ...loyalty,
                mode: nextMode,
                redeemPoints: nextRedeemPoints,
              });
              if (
                nextMode === "REDEEM" &&
                loyalty.found &&
                nextRedeemPoints > 0
              ) {
                void onRequestLoyaltyRedeemQr(nextRedeemPoints);
              }
            }}
            className={`truncate rounded-lg px-3 py-3 transition max-[760px]:px-2 max-[760px]:py-2 ${
              loyalty.mode === item.key
                ? "bg-amber-500 text-black"
                : "hover:text-zinc-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loyalty.lookupError && (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100 max-[760px]:text-xs">
          {loyalty.lookupError}
        </p>
      )}
      {requiresPhone &&
        phoneReady &&
        !loyalty.found &&
        !loyalty.lookupLoading &&
        !loyalty.lookupError && (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-100 max-[760px]:text-xs">
            Эхлээд Шалгах дарж M Point хэрэглэгчээ баталгаажуулна уу.
          </p>
        )}

      <div className="mt-4 grid gap-2 text-sm font-semibold text-zinc-400 min-[760px]:grid-cols-4 max-[760px]:text-xs">
        <div className="min-w-0 rounded-xl bg-zinc-950 px-4 py-3 max-[760px]:px-3 max-[760px]:py-2">
          <p className="truncate text-[10px] uppercase tracking-widest text-zinc-600">
            Хэрэглэгч
          </p>
          <p className="mt-1 truncate text-zinc-200">
            {loyalty.found
              ? loyalty.customerName || loyalty.phone
              : "Шалгаагүй"}
          </p>
        </div>
        <div className="min-w-0 rounded-xl bg-zinc-950 px-4 py-3 max-[760px]:px-3 max-[760px]:py-2">
          <p className="truncate text-[10px] uppercase tracking-widest text-zinc-600">
            Одоогийн үлдэгдэл
          </p>
          <p className="mt-1 text-zinc-200">
            {loyalty.balance.toLocaleString("mn-MN")} M
          </p>
        </div>
        <div className="min-w-0 rounded-xl bg-zinc-950 px-4 py-3 max-[760px]:px-3 max-[760px]:py-2">
          <p className="truncate text-[10px] uppercase tracking-widest text-zinc-600">
            Энэ худалдан авалт
          </p>
          <p className="mt-1 text-amber-300">
            +{estimatedEarnPoints.toLocaleString("mn-MN")} M
          </p>
        </div>
        <div className="min-w-0 rounded-xl bg-zinc-950 px-4 py-3 max-[760px]:px-3 max-[760px]:py-2">
          <p className="truncate text-[10px] uppercase tracking-widest text-zinc-600">
            Дараах үлдэгдэл
          </p>
          <p className="mt-1 text-emerald-300">
            {projectedBalance.toLocaleString("mn-MN")} M
            {loyalty.mode === "REDEEM" && effectiveRedeemPoints > 0 ? (
              <span className="ml-1 text-zinc-500">
                (-{effectiveRedeemPoints.toLocaleString("mn-MN")})
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {loyalty.mode === "REDEEM" && (
        <div className="mt-4 grid gap-2 min-[760px]:grid-cols-[1fr_auto]">
          <input
            value={loyalty.redeemPoints || ""}
            onChange={(event) => {
              onClearLoyaltyRedeemSession();
              onLoyaltyChange({
                ...loyalty,
                redeemPoints: Math.max(
                  0,
                  Math.min(
                    maxRedeemPoints,
                    Math.floor(Number(event.target.value) || 0),
                  ),
                ),
              });
            }}
            placeholder="Хасуулах M Point"
            className="h-12 min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-base font-bold text-white outline-none transition focus:border-amber-400 max-[760px]:h-11 max-[760px]:text-sm"
          />
          <button
            type="button"
            onClick={() => {
              onClearLoyaltyRedeemSession();
              onLoyaltyChange({ ...loyalty, redeemPoints: maxRedeemPoints });
            }}
            disabled={maxRedeemPoints <= 0}
            className="h-12 rounded-xl border border-zinc-700 px-5 text-sm font-black text-zinc-300 hover:border-amber-400 disabled:opacity-40 max-[760px]:h-11 max-[760px]:text-xs"
          >
            Бүгд
          </button>
        </div>
      )}

      {loyalty.mode === "REDEEM" && (
        <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex flex-col gap-4 min-[760px]:flex-row min-[760px]:items-center">
            {loyaltyRedeemSession?.qrPayload ? (
              <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-xl bg-white p-3">
                <QRCodeSVG
                  value={loyaltyRedeemSession.qrPayload}
                  size={156}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#000000"
                  includeMargin
                />
              </div>
            ) : (
              <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-950 text-center text-xs font-semibold text-zinc-500">
                QR үүсгээгүй
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-white">
                  M Point app баталгаажуулалт
                </p>
                {loyaltyRedeemSession?.status === "CONFIRMED" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-black text-emerald-300">
                    <CheckCircle2 size={14} />
                    Баталгаажсан
                  </span>
                )}
                {loyaltyRedeemSession?.status === "PENDING" && (
                  <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-black text-amber-200">
                    App уншуулж байна
                  </span>
                )}
                {loyaltyRedeemSession &&
                  ["EXPIRED", "CANCELLED", "CONSUMED"].includes(
                    loyaltyRedeemSession.status,
                  ) && (
                    <span className="rounded-full bg-rose-400/15 px-2.5 py-1 text-xs font-black text-rose-200">
                      Дахин QR үүсгэнэ
                    </span>
                  )}
              </div>
              {statusMessage && (
                <div
                  className={`mt-3 rounded-xl border px-3 py-2 text-xs font-bold ${
                    statusTone === "success"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      : statusTone === "not-found"
                        ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
                        : "border-zinc-700 bg-zinc-950 text-zinc-300"
                  }`}
                >
                  {statusMessage}
                </div>
              )}
              <p className="mt-2 text-sm font-semibold leading-5 text-zinc-400">
                Хэрэглэгч MGL app-аараа QR уншуулаад{" "}
                {effectiveRedeemPoints.toLocaleString("mn-MN")} M Point
                ашиглахыг батална.
              </p>
              {loyaltyRedeemSession?.expiresAt && (
                <p className="mt-2 text-xs font-semibold text-zinc-500">
                  Дуусах:{" "}
                  {new Date(loyaltyRedeemSession.expiresAt).toLocaleTimeString(
                    "mn-MN",
                    { hour: "2-digit", minute: "2-digit" },
                  )}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void onRequestLoyaltyRedeemQr(effectiveRedeemPoints)
                  }
                  disabled={
                    disabled ||
                    loyaltyRedeemLoading ||
                    !loyalty.found ||
                    effectiveRedeemPoints <= 0 ||
                    loyaltyRedeemSession?.status === "CONFIRMED"
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <QrCode size={15} />
                  {loyaltyRedeemLoading ? "QR үүсгэж байна..." : "QR үүсгэх"}
                </button>
                <button
                  type="button"
                  onClick={() => void onRefreshLoyaltyRedeemSession()}
                  disabled={
                    disabled || loyaltyRedeemLoading || !loyaltyRedeemSession
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-xs font-black text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RefreshCw size={15} />
                  Төлөв шалгах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="rounded-2xl bg-amber-500 px-8 py-3.5 text-sm font-black text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40 max-[760px]:w-full"
        >
          Үргэлжлүүлэх
        </button>
      </div>
    </div>
  );
}
