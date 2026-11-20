import type { CheckoutPaymentEntry } from "../components/PosCheckoutView";
import { checkoutRecoveryStorageKey, parseQPayCheckoutSnapshot } from "./qpay-checkout-recovery";

export interface MissingCardArchiveNotice {
  archiveId: string;
  clientSaleId: string;
  archivedAt: number;
}

export function canArchiveMissingCardCheckout(entries: readonly CheckoutPaymentEntry[], missingIds: readonly string[]): boolean {
  return entries.length > 0 && entries.every(entry => entry.method === "CARD" && entry.status === "pending" &&
    Boolean(entry.attemptId) && missingIds.includes(entry.attemptId ?? ""));
}

const noticeKey = (organizationId: string, registerId: string) =>
  `${checkoutRecoveryStorageKey(organizationId, registerId)}:missing-card-review`;

export function readMissingCardArchiveNotice(organizationId: string, registerId: string, storage: Storage = window.localStorage): MissingCardArchiveNotice | null {
  const raw = storage.getItem(noticeKey(organizationId, registerId));
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || !("archiveId" in value) || typeof value.archiveId !== "string" ||
      !("clientSaleId" in value) || typeof value.clientSaleId !== "string" || !("archivedAt" in value) || typeof value.archivedAt !== "number") return null;
  return { archiveId: value.archiveId, clientSaleId: value.clientSaleId, archivedAt: value.archivedAt };
}

/** Detach only after the server rechecks absence and durably saves the exact financial snapshot. */
export async function archiveMissingCardCheckout(input: {
  organizationId: string;
  registerId: string;
  clientSaleId: string;
  missingIds: readonly string[];
  archive: (request: { snapshot: string; reason: "MISSING_CARD_ATTEMPT"; clientSaleId: string }) => Promise<{ archiveId: string }>;
  storage?: Storage;
}): Promise<MissingCardArchiveNotice> {
  const storage = input.storage ?? window.localStorage;
  const key = checkoutRecoveryStorageKey(input.organizationId, input.registerId);
  const operation = async () => {
    const snapshot = storage.getItem(key);
    const saved = snapshot ? parseQPayCheckoutSnapshot(snapshot, input.registerId) : null;
    if (!snapshot || !saved || saved.clientSaleId !== input.clientSaleId || saved.registerId !== input.registerId ||
        !canArchiveMissingCardCheckout(saved.paymentEntries, input.missingIds)) {
      throw new Error("Сагс эсвэл төлбөр өөрчлөгдсөн байна. Мэдээллийг устгалгүй дахин шалгана уу.");
    }
    const result = await input.archive({ snapshot, reason: "MISSING_CARD_ATTEMPT", clientSaleId: saved.clientSaleId });
    if (!result.archiveId?.trim()) throw new Error("Төлбөрийн мэдээлэл серверт хадгалагдсан нь батлагдаагүй.");
    if (storage.getItem(key) !== snapshot) throw new Error("Сагс өөр tab дээр өөрчлөгдсөн байна. Дахин шалгана уу.");
    const backupKey = `${key}:archived:${result.archiveId}`;
    const previous = storage.getItem(backupKey);
    if (previous !== null && previous !== snapshot) throw new Error("Төлбөрийн нөөц хуулбарын дугаар зөрүүтэй байна.");
    storage.setItem(backupKey, snapshot);
    if (storage.getItem(backupKey) !== snapshot) throw new Error("Төлбөрийн нөөц хуулбар хадгалагдаагүй байна.");
    const notice = { archiveId: result.archiveId, clientSaleId: saved.clientSaleId, archivedAt: Date.now() };
    storage.setItem(noticeKey(input.organizationId, input.registerId), JSON.stringify(notice));
    storage.setItem(`${key}:deferred:${saved.clientSaleId}`, "1");
    storage.removeItem(key);
    if (storage.getItem(key) !== null) throw new Error("Төлбөрийн мэдээллийг тусад нь шилжүүлж чадсангүй.");
    return notice;
  };
  return typeof navigator !== "undefined" && navigator.locks ? navigator.locks.request(key, operation) : operation();
}
