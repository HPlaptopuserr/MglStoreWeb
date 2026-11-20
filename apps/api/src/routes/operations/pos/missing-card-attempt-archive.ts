import type { Prisma } from "@mgl/database";
import { isPaymentRequestId } from "../../../services/payment-request-identity";

type CardRequestTransaction = Pick<Prisma.TransactionClient, "$executeRaw" | "$queryRaw">;
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** The same identity lock covers both creating an attempt and archiving its absence. */
export async function lockCardRequest(tx: CardRequestTransaction, attemptId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`card-request:${attemptId}`}, 0))`;
}

export function missingCardAttemptIds(snapshot: string, clientSaleId: unknown, registerId: string): string[] | null {
  let decoded: unknown;
  try { decoded = JSON.parse(snapshot); } catch { return null; }
  if (!isObject(decoded) || typeof clientSaleId !== "string" || !clientSaleId.trim() ||
      decoded.clientSaleId !== clientSaleId || decoded.registerId !== registerId ||
      !Array.isArray(decoded.paymentEntries) || !decoded.paymentEntries.length) return null;
  const ids: string[] = [];
  for (const entry of decoded.paymentEntries) {
    if (!isObject(entry) || entry.method !== "CARD" || entry.status !== "pending" ||
        typeof entry.attemptId !== "string" || !isPaymentRequestId(entry.attemptId) ||
        typeof entry.amount !== "number" || !Number.isFinite(entry.amount) || entry.amount <= 0 ||
        !Number.isSafeInteger(Math.round(entry.amount * 100))) return null;
    ids.push(entry.attemptId);
  }
  return new Set(ids).size === ids.length ? ids.sort() : null;
}

/** An acknowledged missing request is a tombstone: an old tab cannot dispatch it later. */
export async function isMissingCardRequestArchived(tx: CardRequestTransaction, attemptId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "AuditLog"
    WHERE "action" = 'POS_REGISTER_UPDATED'
      AND "meta" ->> 'event' = 'CHECKOUT_RECOVERY_ARCHIVED'
      AND "meta" ->> 'reason' = 'MISSING_CARD_ATTEMPT'
      AND "meta" -> 'missingAttemptIds' @> ${JSON.stringify([attemptId])}::jsonb
    LIMIT 1
  `;
  return rows.length > 0;
}
