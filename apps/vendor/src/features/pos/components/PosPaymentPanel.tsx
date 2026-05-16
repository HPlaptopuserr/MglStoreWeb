import { Banknote, CreditCard, QrCode, WalletCards } from "lucide-react";
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

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 text-white shadow-sm">
      <div className="border-b border-white/10 px-4 py-2.5">
        <h3 className="inline-flex items-center gap-2 text-sm font-black">
          <WalletCards size={17} className="text-amber-400" />
          Төлбөр авах
        </h3>
      </div>

      <div className="space-y-3 p-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Нийт төлөх</p>
          <p className="mt-1 text-3xl font-black leading-none tracking-tight text-amber-400 tabular-nums">
            ₮{totals.grandTotal.toLocaleString()}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/5 p-1.5">
          {PAYMENT_METHODS.map((method) => {
            const isActive = paymentMethod === method.value;
            const Icon = paymentIcon[method.value];
            return (
              <button
                key={method.value}
                type="button"
                onClick={() => onChangeMethod(method.value as PaymentMethod)}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-xs font-black transition-colors ${
                  isActive
                    ? "bg-amber-400 text-black shadow"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {method.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span>Дүн</span>
            <span className="font-bold text-white">₮{totals.subTotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Хөнгөлөлт</span>
            <span className="font-bold text-white">₮{totals.discountTotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Татвар</span>
            <span className="font-bold text-white">₮{totals.taxTotal.toLocaleString()}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={onSubmit}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-amber-400 px-4 text-sm font-black text-black transition-colors hover:bg-amber-300 active:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Төлбөр авах
        </button>
      </div>
    </section>
  );
}
