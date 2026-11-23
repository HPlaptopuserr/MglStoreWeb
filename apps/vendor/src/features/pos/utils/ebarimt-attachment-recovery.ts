import type { AttachEbarimtPayload } from "../api/ebarimt";

const inFlight = new Map<string, Promise<AttachEbarimtPayload>>();
const issuedInMemory = new Map<string, AttachEbarimtPayload>();
/** Each browser tab has its own memory; the Web Lock and storage are shared. */
export type EbarimtRecoveryMemory = {
  inFlight: Map<string, Promise<AttachEbarimtPayload>>;
  issuedInMemory: Map<string, AttachEbarimtPayload>;
};
const PREFIX = "mglstore.pos.ebarimt-attachment.v1:";
type FiscalMetadata = {
  receiptNo?: string;
  error?: string;
  needsReview?: boolean;
};
type FiscalSnapshot = FiscalMetadata &
  ({ state: "ISSUING" } | { state: "READY"; payload: AttachEbarimtPayload });
const keyFor = (organizationId: string, saleId: string) =>
  `${PREFIX}${encodeURIComponent(organizationId)}:${encodeURIComponent(saleId)}`;

function readSnapshot(storage: Storage, key: string): FiscalSnapshot | null {
  const raw = storage.getItem(key);
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (value && typeof value === "object" && "state" in value) {
    const metadata: FiscalMetadata = {
      needsReview: "needsReview" in value && value.needsReview === true,
      receiptNo:
        "receiptNo" in value && typeof value.receiptNo === "string"
          ? value.receiptNo
          : undefined,
      error:
        "error" in value && typeof value.error === "string"
          ? value.error
          : undefined,
    };
    if (value.state === "ISSUING") return { state: "ISSUING", ...metadata };
    if (
      value.state === "READY" &&
      "payload" in value &&
      value.payload &&
      typeof value.payload === "object"
    ) {
      const payload = value.payload as Record<string, unknown>;
      const fields = [
        "billId",
        "receiptId",
        "qrData",
        "lottery",
        "date",
        "error",
        "customerName",
        "customerTin",
        "customerRegNo",
      ];
      if (
        payload.status === "SUCCESS" &&
        fields.every(
          (field) =>
            payload[field] === undefined ||
            payload[field] === null ||
            typeof payload[field] === "string",
        ) &&
        (payload.receiptType === undefined ||
          payload.receiptType === null ||
          payload.receiptType === "B2C" ||
          payload.receiptType === "B2B")
      ) {
        return {
          state: "READY",
          payload: payload as AttachEbarimtPayload,
          ...metadata,
        };
      }
    }
  }
  throw new Error(
    "eBarimt сэргээх мэдээллийг уншиж чадсангүй. Дахин баримт үүсгэлгүй өмнөх баримтыг шалгана уу.",
  );
}

/** Record the dispatch before the fiscal mutation, then retain its result until the server acknowledges it. */
export async function issueRecoverableEbarimt(
  organizationId: string,
  saleId: string,
  issue: (beforeDispatch: () => void) => Promise<AttachEbarimtPayload>,
  storage: Storage = window.localStorage,
  receiptNo?: string,
  memory: EbarimtRecoveryMemory = { inFlight, issuedInMemory },
): Promise<AttachEbarimtPayload> {
  const activeRequests = memory.inFlight;
  const issuedReceipts = memory.issuedInMemory;
  const key = keyFor(organizationId, saleId);
  const active = activeRequests.get(key);
  if (active) return active;
  const operation = async () => {
    const inMemory = issuedReceipts.get(key);
    if (inMemory) return inMemory;
    const saved = readSnapshot(storage, key);
    if (saved?.state === "READY") return saved.payload;
    if (saved?.state === "ISSUING")
      throw new Error(
        "Өмнөх eBarimt хүсэлтийн хариу тодорхойгүй байна. PosAPI дээр өмнөх баримтыг шалгана уу. Давхар баримт үүсгээгүй.",
      );
    let payload: AttachEbarimtPayload;
    try {
      payload = await issue(() =>
        storage.setItem(key, JSON.stringify({ state: "ISSUING", receiptNo })),
      );
    } catch (error: unknown) {
      try {
        const current = readSnapshot(storage, key);
        if (current?.state === "ISSUING")
          storage.setItem(
            key,
            JSON.stringify({
              ...current,
              error:
                error instanceof Error
                  ? error.message
                  : "PosAPI хүсэлтийн хариу тодорхойгүй байна.",
            }),
          );
      } catch {
        /* Preserve the original dispatch marker if updating its explanation fails. */
      }
      throw error;
    }
    issuedReceipts.set(key, payload);
    try {
      storage.setItem(
        key,
        JSON.stringify({ state: "READY", payload, receiptNo }),
      );
    } catch (error: unknown) {
      console.warn(
        "Fiscal receipt retained in memory; durable dispatch marker preserved",
        error,
      );
    }
    return payload;
  };
  const promise = Promise.resolve(
    typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request(key, operation)
      : operation(),
  );
  activeRequests.set(key, promise);
  try {
    return await promise;
  } finally {
    activeRequests.delete(key);
  }
}

export function acknowledgeEbarimtAttachment(
  organizationId: string,
  saleId: string,
  storage: Storage = window.localStorage,
) {
  issuedInMemory.delete(keyFor(organizationId, saleId));
  try {
    storage.removeItem(keyFor(organizationId, saleId));
  } catch (error: unknown) {
    console.warn(
      "Fiscal attachment acknowledged; recovery cleanup deferred",
      error,
    );
  }
}

/** Retry attachment only: this never dispatches another local fiscal receipt. */
export async function retryEbarimtAttachments(
  organizationId: string,
  attach: (saleId: string, payload: AttachEbarimtPayload) => Promise<unknown>,
  storage: Storage = window.localStorage,
): Promise<number> {
  const prefix = `${PREFIX}${encodeURIComponent(organizationId)}:`;
  const keys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  ).filter((key): key is string => Boolean(key?.startsWith(prefix)));
  let remaining = 0;
  for (const key of keys) {
    try {
      const saved = readSnapshot(storage, key);
      if (saved?.state !== "READY" || saved.needsReview) continue;
      await attach(decodeURIComponent(key.slice(prefix.length)), saved.payload);
      // A newer fiscal result must never be deleted by an older acknowledgement.
      if (
        JSON.stringify(readSnapshot(storage, key)) === JSON.stringify(saved)
      ) {
        storage.removeItem(key);
        issuedInMemory.delete(key);
      }
    } catch (error: unknown) {
      remaining += 1;
      try {
        const snapshot = readSnapshot(storage, key);
        if (snapshot?.state === "READY")
          storage.setItem(
            key,
            JSON.stringify({
              ...snapshot,
              error:
                error instanceof Error
                  ? error.message
                  : "Серверт хадгалах хүсэлт амжилтгүй боллоо.",
              needsReview: Boolean(
                error &&
                typeof error === "object" &&
                "code" in error &&
                ["FISCAL_AMOUNT_MISMATCH", "FISCAL_IDENTITY_MISMATCH"].includes(String(error.code)),
              ),
            }),
          );
      } catch {
        /* Keep the original durable fiscal payload. */
      }
    }
  }
  return remaining;
}

export function hasPendingEbarimtIssue(
  organizationId: string,
  saleId: string,
  storage: Storage = window.localStorage,
): boolean {
  const key = keyFor(organizationId, saleId);
  return issuedInMemory.has(key) || storage.getItem(key) !== null;
}

export function hasDurableEbarimtPayload(
  organizationId: string,
  saleId: string,
  storage: Storage = window.localStorage,
): boolean {
  try {
    return (
      readSnapshot(storage, keyFor(organizationId, saleId))?.state === "READY"
    );
  } catch {
    return false;
  }
}

export interface EbarimtRecoveryItem {
  saleId: string;
  receiptNo: string;
  state: "READY" | "NEEDS_REVIEW";
  error?: string;
}

/** Include uncertain and unreadable records, even after checkout has completed. */
export function listEbarimtRecoveries(
  organizationId: string,
  storage: Storage = window.localStorage,
): EbarimtRecoveryItem[] {
  const prefix = `${PREFIX}${encodeURIComponent(organizationId)}:`;
  const result: EbarimtRecoveryItem[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith(prefix)) continue;
    let saleId = key.slice(prefix.length);
    try {
      saleId = decodeURIComponent(saleId);
    } catch {
      /* Show the original key as the review reference. */
    }
    try {
      const snapshot = readSnapshot(storage, key);
      if (snapshot)
        result.push({
          saleId,
          receiptNo: snapshot.receiptNo || saleId,
          state:
            snapshot.state === "READY" && !snapshot.needsReview
              ? "READY"
              : "NEEDS_REVIEW",
          error: snapshot.error,
        });
    } catch {
      result.push({
        saleId,
        receiptNo: saleId,
        state: "NEEDS_REVIEW",
        error:
          "Хадгалсан баримтын мэдээллийг уншиж чадсангүй. Эх мэдээллийг устгаагүй.",
      });
    }
  }
  return result;
}
