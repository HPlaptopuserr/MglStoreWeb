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
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Төлбөр</h3>
      <div className="mt-3 space-y-3">
        <div className="rounded-xl bg-slate-900 px-4 py-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300">НИЙТ</p>
          <p className="mt-1 text-4xl font-black tracking-tight">
            ₮ {totals.grandTotal.toLocaleString()}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((method) => {
            const isActive = paymentMethod === method.value;
            return (
              <button
                key={method.value}
                type="button"
                onClick={() => onChangeMethod(method.value as PaymentMethod)}
                className={`rounded-lg border px-2 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                }`}
              >
                {method.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={onSubmit}
          className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 px-3 py-3 text-sm font-black text-black disabled:opacity-60 transition-colors"
        >
          Checkout → Төлбөр авах
        </button>
      </div>
    </section>
  );
}
