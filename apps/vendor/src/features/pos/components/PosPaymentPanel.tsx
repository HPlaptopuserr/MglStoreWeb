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
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-3 py-2.5">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <WalletCards size={15} className="text-violet-600" />
          Төлбөр
        </h3>
      </div>
      <div className="space-y-3 p-3">
        <div className="rounded-xl bg-slate-950 px-4 py-3 text-white shadow-inner">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300">НИЙТ</p>
          <p className="mt-1 text-3xl font-black tracking-tight">
            ₮ {totals.grandTotal.toLocaleString()}
          </p>
        </div>

        <div className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span>Дүн</span>
            <span className="font-semibold text-slate-800">₮ {totals.subTotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Хөнгөлөлт</span>
            <span className="font-semibold text-slate-800">₮ {totals.discountTotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Татвар</span>
            <span className="font-semibold text-slate-800">₮ {totals.taxTotal.toLocaleString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((method) => {
            const isActive = paymentMethod === method.value;
            const Icon = paymentIcon[method.value];
            return (
              <button
                key={method.value}
                type="button"
                onClick={() => onChangeMethod(method.value as PaymentMethod)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                }`}
              >
                <Icon size={15} />
                {method.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={onSubmit}
          className="w-full rounded-lg bg-amber-500 px-3 py-2.5 text-sm font-black text-black transition-colors hover:bg-amber-400 active:bg-amber-600 disabled:opacity-60"
        >
          Checkout → Төлбөр авах
        </button>
      </div>
    </section>
  );
}
