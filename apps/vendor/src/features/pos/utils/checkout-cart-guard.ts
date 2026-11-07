import type { CheckoutPaymentEntry } from "../components/PosCheckoutView";

/** An unresolved terminal request can already have charged the customer's card. */
export function hasUnresolvedCardPayment(
  entries: readonly CheckoutPaymentEntry[],
): boolean {
  return entries.some(
    (entry) => entry.method === "CARD" && entry.status === "pending",
  );
}

export function hasProtectedCheckoutPayment(
  entries: readonly CheckoutPaymentEntry[],
): boolean {
  return entries.some(
    (entry) =>
      entry.status === "confirmed" ||
      (entry.method === "CARD" && entry.status === "pending") ||
      (entry.method === "QR" && Boolean(entry.invoiceId)),
  );
}
