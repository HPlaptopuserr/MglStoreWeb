import type {
  CheckoutPaymentEntry,
  CheckoutQPayInvoice,
} from "../components/PosCheckoutView";

/** Only detach the single QR request whose bank response never reached the checkout. */
export function missingQrCancellationTarget(
  entries: CheckoutPaymentEntry[],
  invoice: CheckoutQPayInvoice | null,
  creating: boolean,
): string | null {
  if (
    creating ||
    entries.length !== 1 ||
    !invoice ||
    invoice.qrText.trim() ||
    invoice.qrImage.trim()
  )
    return null;
  const entry = entries[0];
  return entry?.method === "QR" &&
    entry.status === "pending" &&
    entry.invoiceId &&
    entry.invoiceId === invoice.invoiceId
    ? entry.invoiceId
    : null;
}
