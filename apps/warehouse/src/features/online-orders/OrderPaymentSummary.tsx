import { CheckCircle2, CreditCard, ReceiptText } from "lucide-react";
import { formatPaymentMethod } from "./online-order.config";
import type { OnlineOrder } from "./online-order.types";

export function OrderPaymentSummary({ order }: { order: OnlineOrder }) {
  const paymentMethod = formatPaymentMethod(
    order.payment?.method || order.paymentMethod,
  );
  return (
    <section className="mx-5 mb-5 grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 sm:grid-cols-3">
      <PaymentItem
        icon={CheckCircle2}
        label="Төлбөр"
        value="Амжилттай төлөгдсөн"
      />
      <PaymentItem icon={CreditCard} label="Суваг" value={paymentMethod} />
      <PaymentItem
        icon={ReceiptText}
        label="Гүйлгээний лавлагаа"
        value={order.payment?.providerRef || "—"}
      />
      <div className="border-t border-emerald-100 pt-3 sm:col-span-3">
        <div className="grid gap-2 text-xs sm:grid-cols-4">
          <Amount label="Барааны дүн" value={order.subtotal ?? order.total} />
          <Amount
            label="Хөнгөлөлт"
            value={-(order.discountAmount ?? 0)}
          />
          <Amount label="Хүргэлт" value={order.deliveryFee ?? 0} />
          <Amount label="Нийт төлсөн" value={order.total ?? 0} strong />
        </div>
      </div>
    </section>
  );
}

function PaymentItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CreditCard;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={16} className="mt-0.5 shrink-0 text-emerald-600" />
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-600">
          {label}
        </p>
        <p className="mt-0.5 truncate text-xs font-bold text-emerald-950">
          {value}
        </p>
      </div>
    </div>
  );
}

function Amount({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return (
    <div className={strong ? "font-black text-emerald-950" : "text-slate-600"}>
      <span>{label}: </span>
      <span className="tabular-nums">₮{safeValue.toLocaleString()}</span>
    </div>
  );
}
