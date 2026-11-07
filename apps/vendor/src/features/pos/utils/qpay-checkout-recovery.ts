import type {
  CheckoutLoyaltyRedeemSession,
  CheckoutLoyaltyState,
  CheckoutPaymentEntry,
} from "../components/PosCheckoutView";
import type { CartLine } from "../types/pos.types";
import { isCartLine } from "./cart-line-validation";

// Preserve the existing storage key so unresolved QR and split payments survive upgrades.
const STORAGE_PREFIX = "mglstore.pos.qpay-checkout.v1";

export type QPayCheckoutRecovery = {
  clientSaleId: string;
  registerId?: string;
  cart?: CartLine[];
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

const storageKey = (organizationId: string, registerId?: string) =>
  `${STORAGE_PREFIX}:${organizationId.trim()}${registerId ? `:${registerId}` : ""}`;

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

export const hasCheckoutPaymentEvidence = (entries: CheckoutPaymentEntry[]) =>
  entries.some((entry) => entry.status === "confirmed" ||
    (entry.method === "QR" && Boolean(entry.invoiceId)) ||
    (entry.method === "CARD" && Boolean(entry.attemptId)));


export function loadQPayCheckoutRecovery(
  organizationId: string,
  registerId?: string,
): QPayCheckoutRecovery | null {
  if (typeof window === "undefined" || !organizationId.trim()) return null;

  try {
    const raw = window.localStorage.getItem(storageKey(organizationId, registerId)) ??
      (registerId ? window.localStorage.getItem(storageKey(organizationId)) : null);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<QPayCheckoutRecovery>;
    if (registerId && parsed.registerId && parsed.registerId !== registerId) return null;
    if (parsed.cart !== undefined && (!Array.isArray(parsed.cart) || !parsed.cart.length || !parsed.cart.every(isCartLine))) return null;
    const paymentEntries = Array.isArray(parsed.paymentEntries)
      ? parsed.paymentEntries.filter(isPaymentEntry)
      : [];
    const updatedAt = Number(parsed.updatedAt || 0);
    const qpayModalExpiry = Date.parse(
      String(parsed.qpayModal?.expiresAt || ""),
    );

    if (
      typeof parsed.clientSaleId !== "string" ||
      !parsed.clientSaleId ||
      !hasCheckoutPaymentEvidence(paymentEntries) ||
      !Number.isFinite(updatedAt) ||
      !parsed.loyalty
    ) {
      return null;
    }

    return {
      clientSaleId: parsed.clientSaleId,
      registerId: parsed.registerId,
      cart: parsed.cart,
      paymentEntries,
      qpayModal:
        parsed.qpayModal &&
        typeof parsed.qpayModal.invoiceId === "string" &&
        Number.isFinite(parsed.qpayModal.amount) &&
        Number.isFinite(qpayModalExpiry) &&
        qpayModalExpiry > Date.now()
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
    // Storage may be unavailable; a failed read must not delete payment evidence.
    return null;
  }
}

export function saveQPayCheckoutRecovery(
  organizationId: string,
  recovery: Omit<QPayCheckoutRecovery, "updatedAt">,
) {
  if (typeof window === "undefined" || !organizationId.trim()) return;
  if (!hasCheckoutPaymentEvidence(recovery.paymentEntries)) {
    clearQPayCheckoutRecovery(organizationId, recovery.registerId, recovery.clientSaleId);
    return;
  }

  const existing = loadQPayCheckoutRecovery(organizationId, recovery.registerId);
  if (recovery.registerId && window.localStorage.getItem(storageKey(organizationId, recovery.registerId)) && !existing) {
    throw new Error("Өмнөх төлбөрийн хадгалсан мэдээллийг уншиж чадсангүй. Төлбөрийн төлөвийг тулгаж шалгана уу.");
  }
  if (existing && existing.clientSaleId !== recovery.clientSaleId) throw new Error("Энэ кассын өөр tab дээр дуусаагүй төлбөр байна. Өмнөх төлбөрөө эхлээд дуусгана уу.");
  if (recovery.registerId && existing?.paymentEntries.some(entry => entry.status === "confirmed" &&
      (entry.method === "CARD" || entry.method === "QR") && !recovery.paymentEntries.some(item => item.id === entry.id))) {
    throw new Error("Баталгаажсан банкны төлбөрийг сэргээх мэдээллээс устгах боломжгүй.");
  }
  const paymentEntries = recovery.paymentEntries.map(entry => {
    const saved = existing?.paymentEntries.find(item => item.id === entry.id);
    return saved?.status === "confirmed" ? saved : entry;
  });
  window.localStorage.setItem(storageKey(organizationId, recovery.registerId), JSON.stringify({ ...recovery, paymentEntries, updatedAt: Date.now() }));
  if (recovery.registerId && loadQPayCheckoutRecovery(organizationId)?.clientSaleId === recovery.clientSaleId) {
    window.localStorage.removeItem(storageKey(organizationId));
  }
}

/** Serialize the initial durable claim across browser tabs before dispatch. */
export async function claimQPayCheckoutRecovery(organizationId: string, recovery: Omit<QPayCheckoutRecovery, "updatedAt">): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    await navigator.locks.request(storageKey(organizationId, recovery.registerId), () => saveQPayCheckoutRecovery(organizationId, recovery));
  } else {
    saveQPayCheckoutRecovery(organizationId, recovery);
  }
}

export function clearQPayCheckoutRecovery(organizationId: string, registerId?: string, clientSaleId?: string, saleCompleted = false) {
  if (typeof window === "undefined" || !organizationId.trim()) return;
  const saved = loadQPayCheckoutRecovery(organizationId, registerId);
  if (registerId && (!clientSaleId || saved?.clientSaleId !== clientSaleId)) return;
  if (registerId && !saleCompleted && saved?.paymentEntries.some(entry => entry.status === "confirmed" && (entry.method === "CARD" || entry.method === "QR"))) return;
  window.localStorage.removeItem(storageKey(organizationId, registerId));
}
