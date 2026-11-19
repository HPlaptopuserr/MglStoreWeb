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

    return parseQPayCheckoutSnapshot(raw, registerId);
  } catch { return null; }
}

export function parseQPayCheckoutSnapshot(snapshot: string, registerId?: string): QPayCheckoutRecovery | null {
  try {
    const parsed = JSON.parse(snapshot) as Partial<QPayCheckoutRecovery>;
    if (registerId && parsed.registerId && parsed.registerId !== registerId) return null;
    // Register-scoped recovery must never attach old money to an unrelated basket.
    if (registerId && parsed.cart === undefined) return null;
    if (parsed.cart !== undefined && (!Array.isArray(parsed.cart) || !parsed.cart.length || !parsed.cart.every(isCartLine))) return null;
    const paymentEntries = Array.isArray(parsed.paymentEntries) && parsed.paymentEntries.every(isPaymentEntry)
      ? parsed.paymentEntries
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

  if (window.localStorage.getItem(`${storageKey(organizationId, recovery.registerId)}:deferred:${recovery.clientSaleId}`)) {
    throw new Error("Энэ сагс тусад нь хадгалагдсан. Хүлээгдэж буй сагснаас сэргээнэ үү.");
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
  const snapshot = JSON.stringify({ ...recovery, paymentEntries, updatedAt: Date.now() });
  if (!parseQPayCheckoutSnapshot(snapshot, recovery.registerId)) {
    throw new Error("Сагсны төлбөр сэргээх мэдээлэл бүрэн бус байна. Төлбөр эхлээгүй; сагсаа шалгана уу.");
  }
  window.localStorage.setItem(storageKey(organizationId, recovery.registerId), snapshot);
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

/** Only call after the server has acknowledged the complete recovery snapshot. */
export function detachDeferredQPayCheckout(organizationId: string, registerId: string, clientSaleId: string, expectedUpdatedAt: number) {
  const saved = loadQPayCheckoutRecovery(organizationId, registerId);
  if (saved?.clientSaleId !== clientSaleId || saved.updatedAt !== expectedUpdatedAt) throw new Error("Одоогийн сагс өөрчлөгдсөн байна.");
  window.localStorage.setItem(`${storageKey(organizationId, registerId)}:deferred:${clientSaleId}`, "1");
  window.localStorage.removeItem(storageKey(organizationId, registerId));
}

export async function restoreDeferredQPayCheckout(organizationId: string, recovery: QPayCheckoutRecovery) {
  if (loadQPayCheckoutRecovery(organizationId, recovery.registerId)) throw new Error("Одоогийн сагсаа эхлээд дуусгана уу.");
  const key = `${storageKey(organizationId, recovery.registerId)}:deferred:${recovery.clientSaleId}`;
  window.localStorage.removeItem(key);
  try { await claimQPayCheckoutRecovery(organizationId, recovery); }
  catch (error) { window.localStorage.setItem(key, "1"); throw error; }
}

export type QPayCheckoutArchiveRequest = {
  snapshot: string;
  reason: "INVALID_SNAPSHOT" | "EMPTY_CART_PAYMENT";
  clientSaleId: string | null;
};

export type QPayCheckoutArchiveNotice = Omit<QPayCheckoutArchiveRequest, "snapshot"> & {
  archiveId: string;
  archivedAt: number;
};

const archiveNoticeKey = (organizationId: string, registerId: string) =>
  `${storageKey(organizationId, registerId)}:archive-notice`;

export function readQPayCheckoutArchiveNotice(
  organizationId: string,
  registerId: string,
): QPayCheckoutArchiveNotice | null {
  if (typeof window === "undefined" || !organizationId.trim() || !registerId) return null;
  try {
    const raw = window.localStorage.getItem(archiveNoticeKey(organizationId, registerId));
    if (!raw) return null;
    const notice: unknown = JSON.parse(raw);
    if (!notice || typeof notice !== "object") return null;
    const value = notice as Record<string, unknown>;
    if (typeof value.archiveId !== "string" || !value.archiveId ||
        (value.reason !== "INVALID_SNAPSHOT" && value.reason !== "EMPTY_CART_PAYMENT") ||
        typeof value.archivedAt !== "number" || !Number.isFinite(value.archivedAt) ||
        (value.clientSaleId !== null && typeof value.clientSaleId !== "string")) return null;
    return {
      archiveId: value.archiveId, reason: value.reason,
      archivedAt: value.archivedAt, clientSaleId: value.clientSaleId,
    };
  } catch { return null; }
}

/**
 * Detach an unreadable checkout only after the server has durably saved its
 * exact bytes. Money and payment references are never interpreted or cancelled
 * here. Both a local backup and a persistent review notice survive browser reload.
 */
export async function archiveBlockedQPayCheckoutRecovery(
  organizationId: string,
  registerId: string,
  archive: (request: QPayCheckoutArchiveRequest) => Promise<{ archiveId: string }>,
): Promise<boolean> {
  if (typeof window === "undefined" || !organizationId.trim() || !registerId) return false;

  const operation = async (): Promise<boolean> => {
    const scopedKey = storageKey(organizationId, registerId);
    const legacyKey = storageKey(organizationId);
    const scoped = window.localStorage.getItem(scopedKey);
    const sourceKey = scoped !== null ? scopedKey : legacyKey;
    const snapshot = scoped ?? window.localStorage.getItem(legacyKey);
    if (snapshot === null || parseQPayCheckoutSnapshot(snapshot, registerId)) return false;

    let decoded: Record<string, unknown> | null = null;
    try {
      const value: unknown = JSON.parse(snapshot);
      if (value && typeof value === "object" && !Array.isArray(value)) decoded = value as Record<string, unknown>;
    } catch { /* The raw, malformed bytes are still archived without alteration. */ }
    if (decoded?.registerId && decoded.registerId !== registerId) {
      throw new Error("Өмнөх төлбөр өөр кассанд хамаарч байна. Кассын тохиргоогоо шалгана уу.");
    }
    const clientSaleId = typeof decoded?.clientSaleId === "string" && decoded.clientSaleId
      ? decoded.clientSaleId : null;
    const reason = Array.isArray(decoded?.cart) && decoded.cart.length === 0
      ? "EMPTY_CART_PAYMENT" : "INVALID_SNAPSHOT";
    const acknowledgement = await archive({ snapshot, reason, clientSaleId });
    if (!acknowledgement || typeof acknowledgement.archiveId !== "string" || !acknowledgement.archiveId.trim()) {
      throw new Error("Өмнөх төлбөрийн мэдээлэл серверт хадгалагдсан нь баталгаажаагүй. Дахин шалгана уу.");
    }
    if (window.localStorage.getItem(sourceKey) !== snapshot ||
        (sourceKey === legacyKey && window.localStorage.getItem(scopedKey) !== null)) {
      throw new Error("Кассын төлбөрийн мэдээлэл өөрчлөгдсөн байна. Хуудсаа шинэчилж шалгана уу.");
    }

    const backupKey = `${scopedKey}:archived:${acknowledgement.archiveId}`;
    const previousBackup = window.localStorage.getItem(backupKey);
    if (previousBackup !== null && previousBackup !== snapshot) {
      throw new Error("Өмнөх төлбөрийн нөөц хуулбарын дугаар зөрүүтэй байна. Төлбөрийн мэдээлэл өөрчлөгдөөгүй.");
    }
    window.localStorage.setItem(backupKey, snapshot);
    if (window.localStorage.getItem(backupKey) !== snapshot) {
      throw new Error("Өмнөх төлбөрийн нөөц хуулбарыг баталгаажуулж чадсангүй.");
    }
    if (clientSaleId) window.localStorage.setItem(`${scopedKey}:deferred:${clientSaleId}`, "1");
    const notice: QPayCheckoutArchiveNotice = {
      archiveId: acknowledgement.archiveId, reason, clientSaleId, archivedAt: Date.now(),
    };
    window.localStorage.setItem(archiveNoticeKey(organizationId, registerId), JSON.stringify(notice));
    window.localStorage.removeItem(sourceKey);
    if (window.localStorage.getItem(sourceKey) !== null) {
      throw new Error("Өмнөх төлбөрийн мэдээллийг тусад нь шилжүүлж чадсангүй. Дахин шалгана уу.");
    }
    return true;
  };

  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(storageKey(organizationId, registerId), operation);
  }
  return operation();
}
