import type { PosReceipt } from "../types/receipt.types";
import type { AttachEbarimtPayload } from "../api/ebarimt";
import { claimQrFiscalReceipt, type QrFiscalClaim } from "../api/qr-pending-receipts";
import { issueRecoverableEbarimt, type EbarimtRecoveryMemory } from "./ebarimt-attachment-recovery";

/** A persisted owner ID lets this terminal resume its server claim after reload. */
function fiscalClaimId(organizationId: string, saleId: string, storage: Storage): string {
  const key = `mglstore.pos.qr-fiscal-claim.v1:${encodeURIComponent(organizationId)}:${encodeURIComponent(saleId)}`;
  const saved = storage.getItem(key);
  if (saved) return saved;
  const requestId = crypto.randomUUID();
  storage.setItem(key, requestId);
  return requestId;
}

class ExistingQrFiscalReceipt extends Error {
  constructor(readonly payload: AttachEbarimtPayload) { super("Fiscal receipt already issued"); }
}

/** Both the active checkout and the durable receipt queue use this exact lock. */
export async function issueClaimedQrFiscalReceipt(input: {
  organizationId: string;
  invoiceId: string;
  receipt: PosReceipt;
  issue: (beforeDispatch: () => Promise<void>) => Promise<AttachEbarimtPayload>;
  claim?: (invoiceId: string, saleId: string, requestId: string) => Promise<QrFiscalClaim>;
  storage?: Storage;
  memory?: EbarimtRecoveryMemory;
}): Promise<AttachEbarimtPayload> {
  const storage = input.storage ?? window.localStorage;
  try {
    return await issueRecoverableEbarimt(input.organizationId, input.receipt.id, beforeDispatch => {
      if (typeof navigator === "undefined" || !navigator.locks) {
        throw new Error("Энэ browser баримтын цонх хоорондын түгжээг дэмжихгүй байна. Давхар eBarimt үүсгэлгүй дэмждэг browser-оор сэргээнэ үү.");
      }
      return input.issue(async () => {
        // Read-only PosAPI preparation runs before claiming the right to mutate.
        const requestId = fiscalClaimId(input.organizationId, input.receipt.id, storage);
        const claim = await (input.claim ?? claimQrFiscalReceipt)(input.invoiceId, input.receipt.id, requestId);
        if (claim.alreadyIssued && claim.receipt?.id === input.receipt.id && claim.receipt.ebarimt?.status === "SUCCESS") {
          throw new ExistingQrFiscalReceipt({ ...claim.receipt.ebarimt, status: "SUCCESS" });
        }
        // No durable local marker means that a prior dispatch cannot be ruled out.
        // READY/ISSUING snapshots are handled before this callback by the shared lock.
        if (claim.resumed) throw new Error("Өмнөх eBarimt хүсэлтийн local төлөв олдсонгүй. Давхар баримт үүсгэлгүй өмнөх PosAPI баримтыг тулгаж шалгана уу.");
        if (!claim.claimed) throw new Error("eBarimt баримтын серверийн эрхийг баталгаажуулж чадсангүй. Давхар баримт үүсгээгүй.");
        beforeDispatch();
      });
    }, storage, input.receipt.receiptNo, input.memory);
  } catch (error: unknown) {
    if (error instanceof ExistingQrFiscalReceipt) return error.payload;
    throw error;
  }
}
