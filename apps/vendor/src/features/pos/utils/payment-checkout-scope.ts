import type { CheckoutPaymentEntry } from "../components/PosCheckoutView";

export type PaymentCheckoutScope = {
  organizationId: string;
  registerId: string | undefined;
  clientSaleId: string | null;
};

/** A delayed provider response can only affect the basket that requested it. */
export function isCurrentPaymentCheckout(
  expected: PaymentCheckoutScope,
  current: PaymentCheckoutScope,
): boolean {
  return Boolean(expected.organizationId && expected.registerId && expected.clientSaleId &&
    expected.organizationId === current.organizationId &&
    expected.registerId === current.registerId && expected.clientSaleId === current.clientSaleId);
}

export function verifiedQPayObservation(input: {
  expected: PaymentCheckoutScope;
  current: PaymentCheckoutScope;
  invoiceId: string;
  invoice: { invoiceId: string; status: string; amount: number };
  entries: CheckoutPaymentEntry[];
}): { entryId: string; amount: number } | null {
  if (!isCurrentPaymentCheckout(input.expected, input.current)) return null;
  const entry = input.entries.find(item => item.method === "QR" && item.status === "pending" &&
    (item.invoiceId === input.invoiceId || item.id === input.invoiceId));
  if (!entry || input.invoice.status !== "PAID") return null;
  if (input.invoice.invoiceId !== input.invoiceId || !Number.isFinite(input.invoice.amount) ||
      input.invoice.amount <= 0 || Math.round(input.invoice.amount * 100) !== Math.round(entry.amount * 100)) {
    throw new Error("QR төлбөрийн нэхэмжлэл эсвэл дүн сагстай зөрүүтэй байна. Дахин төлбөр авахгүйгээр тулгаж шалгана уу.");
  }
  return { entryId: entry.id, amount: input.invoice.amount };
}

/** Automatic cleanup is restricted to one entirely unpaid, ordinary QR basket. */
export function canReleaseReviewedUnpaidQr(input: {
  invoiceId: string;
  entries: CheckoutPaymentEntry[];
  basketTotal: number;
  loyaltyMode: string;
  hasLoyaltyRedeemSession: boolean;
  creditRepayment: boolean;
  companyReceipt: boolean;
}): boolean {
  const entry = input.entries[0];
  return input.entries.length === 1 && entry?.method === "QR" && entry.status === "pending" &&
    entry.invoiceId === input.invoiceId && Number.isFinite(entry.amount) && entry.amount > 0 &&
    Number.isFinite(input.basketTotal) && Math.round(entry.amount * 100) === Math.round(input.basketTotal * 100) &&
    input.loyaltyMode === "NONE" && !input.hasLoyaltyRedeemSession && !input.creditRepayment && !input.companyReceipt;
}

export function verifiedQPayCancellation(input: {
  expected: PaymentCheckoutScope;
  current: PaymentCheckoutScope;
  invoiceId: string;
  invoice: { invoiceId: string; status: string; amount: number; providerCancellationConfirmed?: boolean };
  entries: CheckoutPaymentEntry[];
}): { entryId: string } | null {
  if (!isCurrentPaymentCheckout(input.expected, input.current) ||
      input.invoice.status !== "EXPIRED" || input.invoice.providerCancellationConfirmed !== true) return null;
  const entry = input.entries.find(item => item.method === "QR" && item.status === "pending" && item.invoiceId === input.invoiceId);
  if (!entry) return null;
  if (input.invoice.invoiceId !== input.invoiceId || !Number.isFinite(input.invoice.amount) ||
      input.invoice.amount <= 0 || Math.round(input.invoice.amount * 100) !== Math.round(entry.amount * 100)) {
    throw new Error("QR цуцлалтын нэхэмжлэл эсвэл дүн зөрүүтэй байна. Төлбөрийн мэдээллийг хэвээр үлдээлээ.");
  }
  return { entryId: entry.id };
}
