import type { PaymentMethod } from "../constants/payment-methods";
import type { PaymentFeedback } from "../types/payment-status.types";

interface Props {
  method: PaymentMethod;
  message?: string;
  tone: "idle" | "success" | "not-found";
  feedback: PaymentFeedback;
  hasPendingQPay: boolean;
  cancelling: boolean;
  disabled?: boolean;
  onCancel: () => void;
}

export function CheckoutPaymentError(props: Props) {
  if (props.tone !== "not-found" || !props.message) return null;
  const selectedMessage = props.feedback[props.method]?.message;
  const isPreviousMethodFailure = selectedMessage !== props.message &&
    Object.entries(props.feedback).some(([method, detail]) =>
      method !== props.method && detail?.kind === "failed" && detail.message === props.message,
    );
  // Hide only a definitive failure from another method. Unknown bank outcomes
  // and checkout-wide errors (stock, session, receipt) must remain visible.
  if (isPreviousMethodFailure && !props.hasPendingQPay) return null;
  return (
    <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700">
        {props.hasPendingQPay ? "QPay төлбөрийн анхааруулга"
          : props.method === "CARD" ? "Картын төлбөр амжилтгүй"
          : props.method === "QR" ? "QPay QR үүссэнгүй" : "Төлбөр амжилтгүй"}
      </p>
      <p className="mt-2 text-sm font-semibold text-rose-800">{props.message}</p>
      {props.hasPendingQPay && (
        <button type="button" onClick={props.onCancel} disabled={props.disabled || props.cancelling}
          className="mt-4 inline-flex items-center justify-center rounded-lg border border-rose-400/50 bg-rose-500/15 px-4 py-2 text-xs font-black text-rose-800 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40">
          {props.cancelling ? "Цуцалж байна..." : "Гүйлгээ цуцалж, сагс цэвэрлэх"}
        </button>
      )}
    </div>
  );
}
