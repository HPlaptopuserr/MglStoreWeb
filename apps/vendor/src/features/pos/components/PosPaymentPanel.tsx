"use client";

import styles from "./PosPaymentPanel.module.css";
import { Banknote, CreditCard, HandCoins, QrCode, Split } from "lucide-react";
import {
  PAYMENT_METHODS,
  PAYMENT_SHORTCUTS,
  type PaymentMethod,
} from "../constants/payment-methods";

interface Props {
  onStartPayment: (method: PaymentMethod) => void;
  disabled?: boolean;
  onStartSplitPayment: () => void;
  splitDisabled?: boolean;
}

const PAYMENT_ICONS = {
  CASH: Banknote,
  CARD: CreditCard,
  QR: QrCode,
  CREDIT: HandCoins,
} as const;

export function PosPaymentPanel({
  onStartPayment,
  onStartSplitPayment,
  disabled,
  splitDisabled,
}: Props) {
  return (
    <section
      aria-label="Төлбөр эхлүүлэх"
      className={`${styles.panel} shrink-0 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm`}
    >
      <div className={styles.methods}>
        {PAYMENT_METHODS.map((method) => {
          const Icon = PAYMENT_ICONS[method.value];
          return (
            <button
              key={method.value}
              type="button"
              disabled={disabled}
              onClick={() => onStartPayment(method.value)}
              aria-keyshortcuts={PAYMENT_SHORTCUTS[method.value]}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-[11px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 ${method.value === "CASH" ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"}`}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{method.value === "QR" ? "QR төлбөр" : method.label}</span>
              <kbd className="text-[10px] font-semibold opacity-60">
                {PAYMENT_SHORTCUTS[method.value]}
              </kbd>
            </button>
          );
        })}
        <button
          type="button"
          disabled={disabled || splitDisabled}
          onClick={onStartSplitPayment}
          aria-haspopup="dialog"
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-1 text-[11px] font-bold text-blue-800 transition-colors hover:border-blue-400 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Split size={17} aria-hidden="true" />
          <span>Хэсэгчилсэн</span>
          <span className="text-[10px] font-medium opacity-60">
            Хувааж төлөх
          </span>
        </button>
      </div>
    </section>
  );
}
