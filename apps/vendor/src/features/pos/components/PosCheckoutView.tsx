"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  Delete,
  ChevronRight,
  RotateCcw,
  Clock,
  Settings,
  X,
  Banknote,
  CreditCard,
  QrCode,
} from "lucide-react";
import type { CartLine, CartTotals } from "../types/pos.types";
import type { PaymentMethod } from "../constants/payment-methods";

type Props = {
  lines: CartLine[];
  totals: CartTotals;
  paymentMethod: PaymentMethod;
  onChangeMethod: (m: PaymentMethod) => void;
  paymentEntries: CheckoutPaymentEntry[];
  remaining: number;
  onAddPayment: (method: PaymentMethod, amount: number) => void | Promise<void>;
  onRequestQPay: (amount: number) => void | Promise<void>;
  onMarkQPayPaid: (id: string) => void;
  onRemovePayment: (id: string) => void;
  onResetPayments: () => void;
  onFinalize: () => void;
  canFinalize: boolean;
  onBack: () => void;
  disabled?: boolean;
  transactionId?: string;
};

export type CheckoutPaymentEntry = {
  id: string;
  method: PaymentMethod;
  amount: number;
  status: "confirmed" | "pending";
  attemptId?: string;
  invoiceId?: string;
  transactionId?: string;
};

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: ReactNode }[] = [
  { value: "CASH", label: "Бэлэн", icon: <Banknote size={16} /> },
  { value: "CARD", label: "Карт", icon: <CreditCard size={16} /> },
  { value: "QR", label: "QPay", icon: <QrCode size={16} /> },
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
}: Props) {
  const [enteredAmount, setEnteredAmount] = useState("");

  const parsedAmount = parseFloat(enteredAmount.replace(/,/g, "")) || 0;
  const pendingTotal = paymentEntries
    .filter((item) => item.status === "pending")
    .reduce((sum, item) => sum + item.amount, 0);
  const enteredForPreview = parsedAmount > 0 ? parsedAmount : 0;
  const previewRemaining = Math.max(0, remaining - enteredForPreview);

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

  const handlePrimaryAction = () => {
    const amount = parsedAmount > 0 ? parsedAmount : Math.max(0, remaining);
    if (amount <= 0) return;

    if (paymentMethod === "QR") {
      void onRequestQPay(amount);
    } else {
      void onAddPayment(paymentMethod, amount);
    }

    setEnteredAmount("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center">
              <span className="text-[10px] font-black text-black">M</span>
            </div>
            <span className="text-sm font-bold text-white">MGL POS</span>
          </div>
          <span className="text-zinc-700">•</span>
          <span className="text-xs text-zinc-500">Checkout: {transactionId}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-zinc-300 border border-zinc-700 hover:border-zinc-500 transition-colors"
          >
            REGISTER
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-zinc-400 border border-zinc-700 hover:border-zinc-600 transition-colors"
          >
            <Clock size={12} className="inline mr-1" />
            HISTORY
          </button>
          <button
            type="button"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 transition-colors"
          >
            <Settings size={14} />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: payment selector + numpad ── */}
        <div className="w-[400px] shrink-0 flex flex-col gap-4 border-r border-zinc-800 p-6 overflow-y-auto">
          {/* Payment method tabs */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-3">
              Төлбөрийн хэлбэр
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_OPTIONS.map((opt) => {
                const isActive = paymentMethod === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChangeMethod(opt.value)}
                    className={`flex flex-col items-center gap-1.5 py-4 rounded-xl text-sm font-bold border transition-all ${
                      isActive
                        ? "bg-zinc-100 text-zinc-900 border-zinc-100 shadow-lg shadow-zinc-900"
                        : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300"
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount entry display */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
              Дүн оруулах
            </p>
            <div className="rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3 flex items-baseline gap-1 justify-end">
              <span className="text-zinc-500 text-base font-bold">₮</span>
              <span className="text-3xl font-black text-white tabular-nums">
                {enteredAmount === ""
                  ? "0.00"
                  : parseFloat(enteredAmount || "0").toLocaleString()}
              </span>
            </div>
              <p className="mt-2 text-xs text-zinc-500">
                Үлдэгдэл: ₮{remaining.toLocaleString()} • Оруулах дараа: ₮{previewRemaining.toLocaleString()}
              </p>
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {NUMPAD_ROWS.flat().map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleNumpad(key)}
                className={`py-4 rounded-xl text-lg font-bold transition-all select-none ${
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
              className="py-2.5 rounded-lg text-xs font-bold bg-zinc-800 border border-zinc-700 text-rose-400 hover:bg-rose-950 hover:border-rose-800 transition-colors flex items-center justify-center"
            >
              <RotateCcw size={13} />
            </button>
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setEnteredAmount(String(amt))}
                className="py-2.5 rounded-lg text-xs font-bold bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
              >
                ₮{amt >= 1000 ? `${amt / 1000}К` : amt}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={disabled || remaining <= 0}
              className="rounded-xl bg-amber-500 px-3 py-3 text-xs font-black text-black hover:bg-amber-400 disabled:opacity-40"
            >
              {paymentMethod === "QR" ? "QPay QR илгээх" : "Төлбөр нэмэх"}
            </button>
            <button
              type="button"
              onClick={onResetPayments}
              disabled={paymentEntries.length === 0}
              className="rounded-xl border border-zinc-700 px-3 py-3 text-xs font-bold text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
            >
              Төлбөрүүд цэвэрлэх
            </button>
          </div>

          <div
            className={`rounded-xl px-5 py-4 border ${
              remaining <= 0 ? "bg-emerald-950 border-emerald-800" : "bg-amber-950 border-amber-800"
            }`}
          >
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Төлбөрийн төлөв</p>
            <p
              className={`text-3xl font-black tabular-nums mt-1 ${
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
        <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 shrink-0">
            Захиалгын жагсаалт
          </p>

          {/* Scrollable item list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {lines.map((line) => (
              <div
                key={line.productId}
                className="flex items-center justify-between rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3"
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

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2 max-h-44 overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Төлбөрийн мөрүүд</p>
            {paymentEntries.length === 0 ? (
              <p className="text-xs text-zinc-500">Одоогоор төлбөр нэмээгүй байна.</p>
            ) : (
              paymentEntries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-zinc-300">
                      {entry.method} • ₮{entry.amount.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2">
                      {entry.status === "pending" ? (
                        <button
                          type="button"
                          onClick={() => onMarkQPayPaid(entry.id)}
                          className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-500"
                        >
                          QPay батлах
                        </button>
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
                </div>
              ))
            )}
          </div>

          {/* Totals card */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 px-6 py-5 space-y-2.5 shrink-0">
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
              <p className="mt-1 text-5xl font-black tabular-nums text-amber-400 leading-none">
                ₮{totals.grandTotal.toLocaleString()}
              </p>
              <p className="mt-2 text-xs font-semibold text-zinc-400">
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
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-4 text-base font-black text-black flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-900/30"
            >
              Гүйлгээ батлах
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full rounded-xl border border-zinc-700 text-zinc-500 hover:text-zinc-200 hover:border-zinc-500 px-6 py-3 text-sm font-semibold transition-colors"
            >
              ← Кассанд буцах
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
