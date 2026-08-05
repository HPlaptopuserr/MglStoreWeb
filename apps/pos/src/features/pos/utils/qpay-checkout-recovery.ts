import type {
  CheckoutLoyaltyRedeemSession,
  CheckoutLoyaltyState,
  CheckoutPaymentEntry,
} from "../components/PosCheckoutView";

const STORAGE_PREFIX = "mglstore.pos.qpay-checkout.v1";
const MAX_RECOVERY_AGE_MS = 24 * 60 * 60 * 1000;

export type QPayCheckoutRecovery = {
  clientSaleId: string;
  paymentEntries: CheckoutPaymentEntry[];
  qpayModal: {
    open: boolean;
    invoiceId: string;
    amount: number;
    qrText: string;
    qrImage: string;
    expiresAt: string;
  } | null;
  loyalty: CheckoutLoyaltyState;
  loyaltyRedeemSession: CheckoutLoyaltyRedeemSession | null;
  updatedAt: number;
};

const storageKey = (organizationId: string) =>
  `${STORAGE_PREFIX}:${organizationId.trim()}`;

const isPaymentEntry = (value: unknown): value is CheckoutPaymentEntry => {
  if (!value || typeof value !== "object") return false;
  const entry = value as CheckoutPaymentEntry;
  return (
    typeof entry.id === "string" &&
    ["CASH", "CARD", "QR", "CREDIT"].includes(entry.method) &&
    Number.isFinite(entry.amount) &&
    entry.amount > 0 &&
    (entry.status === "pending" || entry.status === "confirmed")
  );
};

const hasQPayInvoice = (entries: CheckoutPaymentEntry[]) =>
  entries.some(
    (entry) =>
      entry.method === "QR" &&
      typeof entry.invoiceId === "string" &&
      entry.invoiceId.length > 0,
  );

export function loadQPayCheckoutRecovery(
  organizationId: string,
): QPayCheckoutRecovery | null {
  if (typeof window === "undefined" || !organizationId.trim()) return null;

  try {
    const raw = window.localStorage.getItem(storageKey(organizationId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<QPayCheckoutRecovery>;
    const paymentEntries = Array.isArray(parsed.paymentEntries)
      ? parsed.paymentEntries.filter(isPaymentEntry)
      : [];
    const updatedAt = Number(parsed.updatedAt || 0);

    if (
      typeof parsed.clientSaleId !== "string" ||
      !parsed.clientSaleId ||
      !hasQPayInvoice(paymentEntries) ||
      !Number.isFinite(updatedAt) ||
      Date.now() - updatedAt > MAX_RECOVERY_AGE_MS ||
      !parsed.loyalty
    ) {
      window.localStorage.removeItem(storageKey(organizationId));
      return null;
    }

    return {
      clientSaleId: parsed.clientSaleId,
      paymentEntries,
      qpayModal:
        parsed.qpayModal &&
        typeof parsed.qpayModal.invoiceId === "string" &&
        Number.isFinite(parsed.qpayModal.amount)
          ? { ...parsed.qpayModal, open: true }
          : null,
      loyalty: {
        ...parsed.loyalty,
        lookupLoading: false,
        lookupError: "",
      },
      loyaltyRedeemSession: parsed.loyaltyRedeemSession || null,
      updatedAt,
    };
  } catch {
    window.localStorage.removeItem(storageKey(organizationId));
    return null;
  }
}

export function saveQPayCheckoutRecovery(
  organizationId: string,
  recovery: Omit<QPayCheckoutRecovery, "updatedAt">,
) {
  if (typeof window === "undefined" || !organizationId.trim()) return;
  if (!hasQPayInvoice(recovery.paymentEntries)) {
    clearQPayCheckoutRecovery(organizationId);
    return;
  }

  window.localStorage.setItem(
    storageKey(organizationId),
    JSON.stringify({ ...recovery, updatedAt: Date.now() }),
  );
}

export function clearQPayCheckoutRecovery(organizationId: string) {
  if (typeof window === "undefined" || !organizationId.trim()) return;
  window.localStorage.removeItem(storageKey(organizationId));
}
