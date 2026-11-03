import type { CheckoutPaymentEntry } from "../components/PosCheckoutView";
import type { PaymentMethod } from "../constants/payment-methods";

export function canSwitchAfterQrCancellation(result: {
  status: string;
  providerCancellationConfirmed?: boolean;
}): boolean {
  return result.status === "EXPIRED" && result.providerCancellationConfirmed === true;
}

export function paymentMethodSwitchState(
  entries: readonly CheckoutPaymentEntry[],
  remaining: number,
  processing: boolean,
): "waiting" | "paid" | "ready" {
  if (processing || entries.some(entry => entry.status === "pending")) return "waiting";
  if (remaining <= 0 && entries.some(entry => entry.status === "confirmed")) return "paid";
  return "ready";
}

/** Each outstanding bank request must settle before a new method becomes usable. */
export async function preparePaymentMethodSwitch(
  entries: readonly CheckoutPaymentEntry[],
  resolve: (entry: CheckoutPaymentEntry) => Promise<void>,
): Promise<void> {
  for (const entry of entries) {
    if (entry.status === "pending") await resolve(entry);
  }
}

export const paymentMethodName: Record<PaymentMethod, string> = {
  CASH: "Бэлэн", CARD: "Карт", QR: "QR", CREDIT: "Зээл",
};
