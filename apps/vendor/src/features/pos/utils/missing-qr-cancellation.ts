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

/** A dismissed QR panel is presentation state, not evidence that a bank QR exists. */
export async function resolveMissingQrCancellationTarget(
  entries: CheckoutPaymentEntry[],
  invoice: CheckoutQPayInvoice | null,
  creating: boolean,
  readInvoice: (invoiceId: string) => Promise<{
    invoiceId: string;
    status: string;
    qrText: string;
    qrImage?: string;
  }>,
): Promise<string | null> {
  if (creating || entries.length !== 1) return null;
  const entry = entries[0];
  if (entry?.method !== "QR" || entry.status !== "pending" || !entry.invoiceId) return null;
  if (invoice) return missingQrCancellationTarget(entries, invoice, creating);
  // Read the stored response only; cancellation must not wait on another bank poll.
  const stored = await readInvoice(entry.invoiceId);
  return stored.invoiceId === entry.invoiceId && (stored.status === "PENDING" || stored.status === "EXPIRED") &&
    !stored.qrText.trim() && !stored.qrImage?.trim()
    ? entry.invoiceId : null;
}
