import { Banknote, CreditCard, HandCoins, QrCode } from "lucide-react";
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
    CREDIT: HandCoins,
  } as const;

  const shortcuts = {
    CASH: "F9",
    CARD: "F10",
    QR: "F11",
    CREDIT: "F8",
  } as const;

  return (
    <section className="shrink-0 overflow-hidden rounded-xl border border-[#273647] bg-[#0d1c2d] p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#bcc8d1]">Төлбөрийн хэлбэр</p>
        <p className="text-xs font-black tabular-nums text-[#92d9ff]">Нийт {totals.grandTotal.toLocaleString()}₮</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {PAYMENT_METHODS.map((method) => {
          const isActive = paymentMethod === method.value;
          const Icon = paymentIcon[method.value];
          return (
            <button
              key={method.value}
              type="button"
              onClick={() => onChangeMethod(method.value as PaymentMethod)}
              className={`flex h-[74px] flex-col items-center justify-center rounded-lg border text-[11px] font-black transition-colors ${
                isActive
                  ? "border-[#92d9ff] bg-[#92d9ff] text-[#003548]"
                  : "border-[#273647] bg-[#122131] text-[#bcc8d1] hover:border-[#75d1ff]/60 hover:bg-[#1c2b3c]"
              }`}
            >
              <Icon size={20} />
              <span className="mt-1">{method.value === "QR" ? "QPay" : method.label}</span>
              <span className="text-[10px] font-bold opacity-70">{shortcuts[method.value]}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className="mt-3 flex h-16 w-full items-center justify-center gap-3 rounded-xl bg-[#00c2ff] px-4 text-lg font-black text-[#003548] shadow-[0_18px_45px_rgba(0,194,255,0.22)] transition-colors hover:bg-[#75d1ff] active:bg-[#00a8df] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Banknote size={24} />
        Төлбөр авах
        <span className="text-xs opacity-70">F12</span>
      </button>
    </section>
  );
}
