import { Banknote, CreditCard, MoreHorizontal, QrCode } from "lucide-react";
import type { CartTotals } from "../types/pos.types";
import { PAYMENT_METHODS, type PaymentMethod } from "../constants/payment-methods";

type Props = {
  totals: CartTotals;
  paymentMethod: PaymentMethod;
  onChangeMethod: (method: PaymentMethod) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

export function PosPaymentPanel({
  totals,
  paymentMethod,
  onChangeMethod,
  onSubmit,
  disabled,
}: Props) {
  const paymentIcon = {
    CASH: Banknote,
    CARD: CreditCard,
    QR: QrCode,
  } as const;

  const shortcuts = {
    CASH: "F9",
    CARD: "F10",
    QR: "F11",
  } as const;

  return (
    <section className="shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
      <div className="grid grid-cols-4 gap-2">
        {PAYMENT_METHODS.map((method) => {
          const isActive = paymentMethod === method.value;
          const Icon = paymentIcon[method.value];
          return (
            <button
              key={method.value}
              type="button"
              onClick={() => onChangeMethod(method.value as PaymentMethod)}
              className={`flex h-12 flex-col items-center justify-center rounded-lg border text-xs font-black transition-colors ${
                isActive
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"
              }`}
            >
              <Icon size={18} />
              <span className="mt-1">
                {method.value === "QR" ? "QR төлбөр" : method.label}
              </span>
              <span className="text-[10px] font-bold opacity-70">{shortcuts[method.value]}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="flex h-12 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-600 hover:bg-slate-50"
        >
          <MoreHorizontal size={18} />
          <span className="mt-1">Бусад</span>
        </button>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="flex-1 text-center">Төлбөр авах</span>
        <span className="text-xs opacity-80">F12</span>
      </button>

      <p className="mt-1.5 text-right text-[10px] font-semibold text-slate-400">
        Нийт төлөх: ₮{totals.grandTotal.toLocaleString()}
      </p>
    </section>
  );
}
