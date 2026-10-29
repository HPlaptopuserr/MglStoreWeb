import { prisma, PosPaymentStatus, type Prisma } from "@mgl/database";
import type { CardPaymentAttempt } from "@prisma/client";
import { getMinuAgentContextForRegister } from "./minu-register-context";
import { checkMinuAgentTransaction, type MinuTxnResult } from "./minu-pos-agent";

export function minuCardInvoice(attempt: CardPaymentAttempt): string | null {
  const payload = attempt.providerPayload;
  if (
    attempt.consumedAt || attempt.saleReference ||
    (attempt.status !== PosPaymentStatus.PENDING && attempt.status !== PosPaymentStatus.FAILED) ||
    !payload || typeof payload !== "object" || Array.isArray(payload) ||
    payload.provider !== "MINU_AGENT" || typeof payload.invoice !== "string"
  ) return null;
  return payload.invoice.trim() || null;
}

/** Explicit terminal approval is sufficient; some Minu terminals omit the RRN. */
export function minuCardStatusUpdate(
  attempt: CardPaymentAttempt,
  result: MinuTxnResult,
): Prisma.CardPaymentAttemptUpdateManyMutationInput | null {
  const invoice = minuCardInvoice(attempt);
  if (!invoice) return null;
  if (result.entity?.invoice && result.entity.invoice !== invoice) {
    throw new Error("Minu хариуны нэхэмжлэх төлбөртэй таарахгүй байна");
  }
  const payload = attempt.providerPayload as Prisma.JsonObject;
  return {
    status: result.approved ? PosPaymentStatus.APPROVED
      : result.declined ? PosPaymentStatus.DECLINED : PosPaymentStatus.PENDING,
    ...(result.approved ? {
      transactionId: result.transactionId || invoice,
      traceno: String(result.entity?.rrn ?? "").trim() || null,
    } : {}),
    message: result.message || "Minu төлбөрийн төлөвийг автоматаар шалгаж байна",
    providerPayload: { ...payload, checkTxn: result.raw } as object,
  };
}

async function reconcileAttempt(attempt: CardPaymentAttempt) {
  const invoice = minuCardInvoice(attempt);
  if (!invoice) return { attempt, result: null };
  const context = await getMinuAgentContextForRegister(attempt.registerId);
  if (!context) throw new Error("Minu Agent merchant тохиргоо олдсонгүй");
  const result = await checkMinuAgentTransaction(context, invoice);
  const data = minuCardStatusUpdate(attempt, result);
  if (data) {
    // A late pending/declined response must never overwrite approval or consumption.
    await prisma.cardPaymentAttempt.updateMany({
      where: {
        id: attempt.id,
        status: { in: result.approved
          ? [PosPaymentStatus.PENDING, PosPaymentStatus.FAILED, PosPaymentStatus.DECLINED]
          : [PosPaymentStatus.PENDING, PosPaymentStatus.FAILED] },
        consumedAt: null,
        saleReference: null,
      },
      data,
    });
  }
  return {
    attempt: await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } }),
    result,
  };
}

const inFlight = new Map<string, ReturnType<typeof reconcileAttempt>>();

export function reconcileMinuCardAttempt(attempt: CardPaymentAttempt) {
  const existing = inFlight.get(attempt.id);
  if (existing) return existing;
  const work = reconcileAttempt(attempt).finally(() => { inFlight.delete(attempt.id); });
  inFlight.set(attempt.id, work);
  return work;
}

/** Reconcile bank state even while the cashier's browser is offline. Never charge. */
export async function reconcilePendingMinuCards() {
  const now = Date.now();
  const attempts = await prisma.cardPaymentAttempt.findMany({
    where: {
      status: { in: [PosPaymentStatus.PENDING, PosPaymentStatus.FAILED] },
      consumedAt: null,
      saleReference: null,
      createdAt: { gte: new Date(now - 7 * 24 * 60 * 60 * 1000) },
      updatedAt: { lt: new Date(now - 15_000) },
      providerPayload: { path: ["provider"], equals: "MINU_AGENT" },
    },
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    take: 25,
  });
  // Small batches bound provider traffic; failures retain the original invoice.
  const reconcile = async (attempt: CardPaymentAttempt) => {
    try {
      await reconcileMinuCardAttempt(attempt);
    } catch {
      await prisma.cardPaymentAttempt.updateMany({
        where: { id: attempt.id, status: { in: [PosPaymentStatus.PENDING, PosPaymentStatus.FAILED] }, consumedAt: null },
        data: { updatedAt: new Date() },
      });
    }
  };
  for (let offset = 0; offset < attempts.length; offset += 3) {
    await Promise.all(attempts.slice(offset, offset + 3).map(reconcile));
  }
}
