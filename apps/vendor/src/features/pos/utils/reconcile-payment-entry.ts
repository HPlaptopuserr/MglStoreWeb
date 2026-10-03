import type { CheckoutPaymentEntry } from "../components/PosCheckoutView";

/** A late creation response must not downgrade a payment already confirmed by polling. */
export function reconcilePaymentEntry(
  entries: CheckoutPaymentEntry[],
  requestId: string,
  response: CheckoutPaymentEntry,
): CheckoutPaymentEntry[] {
  return entries.map(entry => entry.id === requestId
    ? { ...entry, ...response, status: entry.status === "confirmed" ? "confirmed" : response.status }
    : entry);
}
