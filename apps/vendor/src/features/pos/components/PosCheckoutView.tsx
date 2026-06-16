"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Delete,
  ChevronRight,
  RotateCcw,
  Clock,
  Settings,
  X,
  Banknote,
  CreditCard,
  HandCoins,
  QrCode,
  Gift,
  Search,
} from "lucide-react";
import type { CartLine, CartTotals, PosCreditBorrower, SaleCreditPaymentMeta } from "../types/pos.types";
import type { PaymentMethod } from "../constants/payment-methods";
import { CreditPaymentDialog } from "./CreditPaymentDialog";

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
  onAddPayment: (method: PaymentMethod, amount: number, credit?: SaleCreditPaymentMeta) => void | Promise<void>;
  onRequestQPay: (amount: number) => void | Promise<void>;
  onMarkQPayPaid: (id: string) => void;
  onRemovePayment: (id: string) => void;
  onResetPayments: () => void;
  onFinalize: () => void;
  canFinalize: boolean;
  onBack: () => void;
  disabled?: boolean;
  transactionId?: string;
  loyalty: CheckoutLoyaltyState;
  onLoyaltyChange: (next: CheckoutLoyaltyState) => void;
  onLookupLoyalty: () => void;
  creditBorrowers?: PosCreditBorrower[];
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

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Бэлэн" },
  { value: "CARD", label: "Карт" },
  { value: "QR", label: "QPay" },
  { value: "CREDIT", label: "Зээл" },
];

const QUICK_AMOUNTS = [10_000, 20_000, 50_000, 100_000];

const NUMPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "⌫"],
] as const;

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
  canFinalize,
  onBack,
  disabled,
  transactionId = "TXN-0001",
  loyalty,
  onLoyaltyChange,
  onLookupLoyalty,
  creditBorrowers = [],
}: Props) {
  const [enteredAmount, setEnteredAmount] = useState("");
  const [loyaltyPanelOpen, setLoyaltyPanelOpen] = useState(false);
  const [loyaltyPromptSeen, setLoyaltyPromptSeen] = useState(false);
  const [loyaltyPromptStep, setLoyaltyPromptStep] = useState<"ASK" | "REGISTERED">("ASK");
  const [pendingPaymentAmount, setPendingPaymentAmount] = useState(0);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);

  const parsedAmount = parseFloat(enteredAmount.replace(/,/g, "")) || 0;
  const pendingTotal = paymentEntries
    .filter((item) => item.status === "pending")
    .reduce((sum, item) => sum + item.amount, 0);
  const hasCustomAmount = parsedAmount > 0;
  const paymentAmount = hasCustomAmount
    ? Math.min(parsedAmount, Math.max(0, remaining))
    : Math.max(0, remaining);
  const previewRemaining = Math.max(0, remaining - paymentAmount);
  const estimatedEarnPoints = Math.max(0, Math.floor(totals.grandTotal * loyalty.earnRate));
  const maxRedeemPoints = Math.max(0, Math.min(loyalty.balance, totals.grandTotal));
  const effectiveRedeemPoints =
    loyalty.mode === "REDEEM"
      ? Math.max(0, Math.min(maxRedeemPoints, Math.floor(Number(loyalty.redeemPoints) || 0)))
      : 0;
  const projectedBalance =
    loyalty.mode === "EARN"
      ? loyalty.balance + estimatedEarnPoints
      : Math.max(0, loyalty.balance - effectiveRedeemPoints) + estimatedEarnPoints;

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

    if (!loyaltyPromptSeen) {
      setLoyaltyPromptStep("ASK");
      setPendingPaymentAmount(amount);
      setLoyaltyPanelOpen(true);
      return;
    }

    runPaymentAction(amount);
  };

  const continuePendingPayment = () => {
    const amount = pendingPaymentAmount || paymentAmount;
    setLoyaltyPromptSeen(true);
    setLoyaltyPanelOpen(false);
    setPendingPaymentAmount(0);
    if (amount > 0) runPaymentAction(amount);
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden overscroll-contain bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-3 shrink-0 max-[1500px]:px-4 max-[1500px]:py-2.5 [@media(max-height:850px)]:py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-500 max-[760px]:h-5 max-[760px]:w-5">
              <span className="text-[10px] font-black text-black">M</span>
            </div>
            <span className="text-sm font-bold text-white max-[760px]:text-xs">MGL POS</span>
          </div>
          <span className="text-zinc-700">•</span>
          <span className="text-xs text-zinc-500 max-[760px]:text-[10px]">Checkout: {transactionId}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-500 max-[760px]:px-2.5 max-[760px]:py-1 max-[760px]:text-[10px]"
          >
            REGISTER
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
            onClick={onBack}
            className="rounded-md border border-zinc-700 p-1.5 text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-300 max-[760px]:p-1"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: payment selector + numpad ── */}
        <div className="flex w-[400px] shrink-0 flex-col gap-4 overflow-y-auto overscroll-contain border-r border-zinc-800 p-6 max-[1500px]:w-[340px] max-[1500px]:gap-3 max-[1500px]:p-4 max-[1180px]:w-[300px] max-[1180px]:gap-2.5 max-[1180px]:p-3 [@media(max-height:850px)]:w-[340px] [@media(max-height:850px)]:gap-2.5 [@media(max-height:850px)]:p-3">
          {/* Payment method tabs */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-3">
              Төлбөрийн хэлбэр
            </p>
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
                    onClick={() => onChangeMethod(opt.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border py-4 text-sm font-bold transition-all max-[1500px]:py-3 max-[1500px]:text-xs max-[1180px]:py-2.5 [@media(max-height:850px)]:py-2.5 ${
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
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
              Төлөх дүн
            </p>
            <div className={`rounded-xl border px-4 py-3 transition max-[1500px]:px-3 max-[1500px]:py-2 [@media(max-height:850px)]:py-2 ${
              hasCustomAmount
                ? "border-amber-500/70 bg-amber-500/10"
                : "border-zinc-700 bg-zinc-900"
            }`}>
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
              Үлдэгдэл: ₮{remaining.toLocaleString()} • Төлсний дараа: ₮{previewRemaining.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-zinc-600 max-[1280px]:text-[10px]">
              Хэсэгчлэн төлөх үед доорх товчлуураар дүнгээ өөрчилнө.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={disabled || remaining <= 0}
              className="rounded-xl bg-amber-500 px-3 py-3 text-xs font-black text-black hover:bg-amber-400 disabled:opacity-40 max-[1500px]:py-2.5 max-[1180px]:text-[11px] [@media(max-height:850px)]:py-2"
            >
              {paymentMethod === "QR"
                ? `QPay ₮${paymentAmount.toLocaleString()}`
                : `${PAYMENT_OPTIONS.find((item) => item.value === paymentMethod)?.label || "Төлбөр"} ₮${paymentAmount.toLocaleString()}`}
            </button>
            <button
              type="button"
              onClick={onResetPayments}
              disabled={disabled || paymentEntries.length === 0}
              className="rounded-xl border border-zinc-700 px-3 py-3 text-xs font-bold text-zinc-300 hover:border-zinc-500 disabled:opacity-40 max-[1500px]:py-2.5 max-[1180px]:text-[11px] [@media(max-height:850px)]:py-2"
            >
              Төлбөрүүд цэвэрлэх
            </button>
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {NUMPAD_ROWS.flat().map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleNumpad(key)}
                  className={`select-none rounded-xl py-4 text-lg font-bold transition-all max-[1500px]:py-3 max-[1500px]:text-base max-[1180px]:py-2.5 [@media(max-height:850px)]:py-2.5 ${
                  key === "⌫"
                    ? "bg-zinc-800 text-amber-400 hover:bg-amber-950 hover:border-amber-800 border border-zinc-700"
                    : "bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-600 active:scale-95"
                }`}
              >
                {key === "⌫" ? <Delete size={18} className="mx-auto" /> : key}
              </button>
            ))}
          </div>

          {/* Quick-amount row */}
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setEnteredAmount("")}
              className="flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 text-xs font-bold text-rose-400 transition-colors hover:border-rose-800 hover:bg-rose-950 max-[1280px]:py-2 max-[760px]:text-[10px]"
            >
              <RotateCcw size={13} />
            </button>
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setEnteredAmount(String(amt))}
                className="rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-bold text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 max-[1500px]:py-2 max-[1180px]:text-[10px]"
              >
                ₮{amt >= 1000 ? `${amt / 1000}К` : amt}
              </button>
            ))}
          </div>

          <div
            className={`rounded-xl border px-5 py-4 max-[1500px]:px-3 max-[1500px]:py-3 [@media(max-height:850px)]:py-2.5 ${
              remaining <= 0 ? "bg-emerald-950 border-emerald-800" : "bg-amber-950 border-amber-800"
            }`}
          >
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Төлбөрийн төлөв</p>
            <p
              className={`mt-1 text-3xl font-black tabular-nums max-[1500px]:text-2xl max-[1180px]:text-xl ${
                remaining <= 0 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {remaining <= 0 ? "Төлөгдсөн" : `Үлдэгдэл ₮ ${remaining.toLocaleString()}`}
            </p>
            {pendingTotal > 0 && (
              <p className="mt-1 text-xs text-zinc-400">Хүлээгдэж буй QPay: ₮{pendingTotal.toLocaleString()}</p>
            )}
          </div>
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
                  <p className="text-sm font-semibold text-white truncate">{line.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {line.qty} × ₮{line.unitPrice.toLocaleString()}
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
                    Дуусах: {new Date(qpayModal.expiresAt).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!qpayModal?.open && statusMessage && statusTone === "not-found" && (paymentMethod === "QR" || paymentMethod === "CARD") && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-300">
                {paymentMethod === "CARD" ? "Картын төлбөр амжилтгүй" : "QPay QR үүссэнгүй"}
              </p>
              <p className="mt-2 text-sm font-semibold text-rose-100">
                {statusMessage}
              </p>
            </div>
          )}

          <div className="max-h-44 space-y-2 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 max-[1500px]:max-h-32 max-[1500px]:p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Төлбөрийн мөрүүд</p>
            {paymentEntries.length === 0 ? (
              <p className="text-xs text-zinc-500">Одоогоор төлбөр нэмээгүй байна.</p>
            ) : (
              paymentEntries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-zinc-300">
                      {entry.method === "CREDIT" && entry.credit
                        ? `Зээл • ${entry.credit.borrowerName}${entry.credit.employeeName ? ` • ${entry.credit.employeeName}` : ""} • ₮${entry.amount.toLocaleString()}`
                        : `${entry.method} • ₮${entry.amount.toLocaleString()}`}
                    </p>
                    <div className="flex items-center gap-2">
                      {entry.status === "pending" && entry.method === "QR" ? (
                        <button
                          type="button"
                          onClick={() => onMarkQPayPaid(entry.id)}
                          className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-500"
                        >
                          QPay батлах
                        </button>
                      ) : entry.status === "pending" ? (
                        <span className="text-[10px] font-bold text-amber-400">Хүлээгдэж байна</span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400">Баталгаажсан</span>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemovePayment(entry.id)}
                        className="rounded-md border border-zinc-700 px-2 py-1 text-[10px] font-bold text-zinc-400 hover:border-zinc-500"
                      >
                        Устгах
                      </button>
                    </div>
                  </div>
                  {entry.invoiceId && (
                    <p className="mt-1 text-[10px] text-zinc-500">Invoice: {entry.invoiceId}</p>
                  )}
                  {entry.transactionId && (
                    <p className="mt-1 text-[10px] text-zinc-500">Txn: {entry.transactionId}</p>
                  )}
                  {entry.credit && (
                    <p className="mt-1 text-[10px] text-zinc-500">
                      Хүү: ₮{entry.credit.totalInterest.toLocaleString()} • Нийт: ₮{entry.credit.totalDue.toLocaleString()} • {entry.credit.termMonths} сар
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
              <span className="tabular-nums">₮{totals.subTotal.toLocaleString()}</span>
            </div>
            {totals.taxTotal > 0 && (
              <div className="flex justify-between text-sm text-zinc-500">
                <span>НӨАТ</span>
                <span className="tabular-nums">₮{totals.taxTotal.toLocaleString()}</span>
              </div>
            )}
            {totals.discountTotal > 0 && (
              <div className="flex justify-between text-sm text-emerald-400">
                <span>Хөнгөлөлт</span>
                <span className="tabular-nums">-₮{totals.discountTotal.toLocaleString()}</span>
              </div>
            )}
            <div className="pt-4 border-t border-zinc-700">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600">Нийт төлөх дүн</p>
              <p className="mt-1 text-5xl font-black leading-none tabular-nums text-amber-400 max-[1500px]:text-4xl [@media(max-height:850px)]:text-3xl">
                ₮{totals.grandTotal.toLocaleString()}
              </p>
              <p className="mt-2 text-xs font-semibold text-zinc-400 max-[1280px]:text-[11px]">
                Төлсөн: ₮{(totals.grandTotal - remaining).toLocaleString()} • Үлдэгдэл: ₮{remaining.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 shrink-0">
            <button
              type="button"
              onClick={onFinalize}
              disabled={disabled || !canFinalize}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-4 text-base font-black text-black shadow-lg shadow-amber-900/30 transition-colors hover:bg-amber-400 active:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40 max-[1500px]:py-3 max-[1500px]:text-sm [@media(max-height:850px)]:py-2.5"
            >
              Гүйлгээ батлах
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-200 max-[1500px]:py-2.5 max-[1500px]:text-xs [@media(max-height:850px)]:py-2"
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
          <p className="text-xl font-black text-white max-[760px]:text-lg">M Point бүртгэлтэй юу?</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-zinc-500 max-[760px]:text-xs max-[760px]:leading-5">
            Бүртгэлтэй бол дугаараа шалгаад point цуглуулах эсвэл хасуулах сонголтоо батална.
            Бүртгэлгүй бол M Point ашиглахгүйгээр төлбөр үргэлжилнэ.
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
  maxRedeemPoints,
  onContinue,
  onLookupLoyalty,
  onLoyaltyChange,
  projectedBalance,
}: {
  disabled?: boolean;
  effectiveRedeemPoints: number;
  estimatedEarnPoints: number;
  loyalty: CheckoutLoyaltyState;
  maxRedeemPoints: number;
  onContinue: () => void;
  onLookupLoyalty: () => void;
  onLoyaltyChange: (next: CheckoutLoyaltyState) => void;
  projectedBalance: number;
}) {
  const requiresPhone = loyalty.mode !== "NONE";
  const phoneReady = loyalty.phone.replace(/\D/g, "").length >= 6;
  const canContinue =
    !disabled && !loyalty.lookupLoading && (!requiresPhone || (phoneReady && loyalty.found));

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 max-[760px]:p-3">
      <div className="flex items-start justify-between gap-3 pr-12">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300 max-[760px]:h-10 max-[760px]:w-10">
            <Gift size={22} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-white max-[760px]:text-base">M Point урамшуулал</p>
            <p className="line-clamp-1 text-sm font-semibold text-zinc-500 max-[760px]:text-xs">
              2% буцаан олголт, гишүүнчлэлтэй бол өндөр rate-д бэлэн
            </p>
          </div>
        </div>
        {loyalty.membershipBadge !== "NONE" && (
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${
            loyalty.membershipBadge === "MEMBER"
              ? "bg-emerald-400/15 text-emerald-300"
              : "bg-zinc-800 text-zinc-300"
          }`}>
            {loyalty.membershipBadge === "MEMBER" ? "Гишүүн" : "Стандарт"}
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-3 min-[760px]:grid-cols-[minmax(0,1fr)_148px]">
        <input
          value={loyalty.phone}
          onChange={(event) =>
            onLoyaltyChange({
              ...loyalty,
              phone: event.target.value.replace(/\D/g, "").slice(0, 12),
              lookupError: "",
              found: false,
              customerName: null,
              balance: 0,
              membershipBadge: "NONE",
              redeemPoints: 0,
            })
          }
          placeholder="Хэрэглэгчийн утас"
          className="h-12 min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-base font-bold text-white outline-none transition focus:border-amber-400 max-[760px]:h-11 max-[760px]:text-sm"
        />
        <button
          type="button"
          onClick={onLookupLoyalty}
          disabled={disabled || loyalty.lookupLoading || loyalty.phone.replace(/\D/g, "").length < 6}
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
            onClick={() =>
              onLoyaltyChange({
                ...loyalty,
                mode: item.key as CheckoutLoyaltyState["mode"],
                redeemPoints: item.key === "REDEEM" ? loyalty.redeemPoints : 0,
              })
            }
            className={`truncate rounded-lg px-3 py-3 transition max-[760px]:px-2 max-[760px]:py-2 ${
              loyalty.mode === item.key ? "bg-amber-500 text-black" : "hover:text-zinc-200"
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
      {requiresPhone && phoneReady && !loyalty.found && !loyalty.lookupLoading && !loyalty.lookupError && (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-100 max-[760px]:text-xs">
          Эхлээд Шалгах дарж M Point хэрэглэгчээ баталгаажуулна уу.
        </p>
      )}

      <div className="mt-4 grid gap-2 text-sm font-semibold text-zinc-400 min-[760px]:grid-cols-4 max-[760px]:text-xs">
        <div className="min-w-0 rounded-xl bg-zinc-950 px-4 py-3 max-[760px]:px-3 max-[760px]:py-2">
          <p className="truncate text-[10px] uppercase tracking-widest text-zinc-600">Хэрэглэгч</p>
          <p className="mt-1 truncate text-zinc-200">
            {loyalty.found ? loyalty.customerName || loyalty.phone : "Шалгаагүй"}
          </p>
        </div>
        <div className="min-w-0 rounded-xl bg-zinc-950 px-4 py-3 max-[760px]:px-3 max-[760px]:py-2">
          <p className="truncate text-[10px] uppercase tracking-widest text-zinc-600">Одоогийн үлдэгдэл</p>
          <p className="mt-1 text-zinc-200">{loyalty.balance.toLocaleString("mn-MN")} M</p>
        </div>
        <div className="min-w-0 rounded-xl bg-zinc-950 px-4 py-3 max-[760px]:px-3 max-[760px]:py-2">
          <p className="truncate text-[10px] uppercase tracking-widest text-zinc-600">Энэ худалдан авалт</p>
          <p className="mt-1 text-amber-300">+{estimatedEarnPoints.toLocaleString("mn-MN")} M</p>
        </div>
        <div className="min-w-0 rounded-xl bg-zinc-950 px-4 py-3 max-[760px]:px-3 max-[760px]:py-2">
          <p className="truncate text-[10px] uppercase tracking-widest text-zinc-600">Дараах үлдэгдэл</p>
          <p className="mt-1 text-emerald-300">
            {projectedBalance.toLocaleString("mn-MN")} M
            {loyalty.mode === "REDEEM" && effectiveRedeemPoints > 0 ? (
              <span className="ml-1 text-zinc-500">(-{effectiveRedeemPoints.toLocaleString("mn-MN")})</span>
            ) : null}
          </p>
        </div>
      </div>

      {loyalty.mode === "REDEEM" && (
        <div className="mt-4 grid gap-2 min-[760px]:grid-cols-[1fr_auto]">
          <input
            value={loyalty.redeemPoints || ""}
            onChange={(event) =>
              onLoyaltyChange({
                ...loyalty,
                redeemPoints: Math.max(0, Math.min(maxRedeemPoints, Math.floor(Number(event.target.value) || 0))),
              })
            }
            placeholder="Хасуулах M Point"
            className="h-12 min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-base font-bold text-white outline-none transition focus:border-amber-400 max-[760px]:h-11 max-[760px]:text-sm"
          />
          <button
            type="button"
            onClick={() => onLoyaltyChange({ ...loyalty, redeemPoints: maxRedeemPoints })}
            disabled={maxRedeemPoints <= 0}
            className="h-12 rounded-xl border border-zinc-700 px-5 text-sm font-black text-zinc-300 hover:border-amber-400 disabled:opacity-40 max-[760px]:h-11 max-[760px]:text-xs"
          >
            Бүгд
          </button>
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
