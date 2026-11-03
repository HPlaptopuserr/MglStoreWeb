import type { CardPaymentAttempt } from "@prisma/client";
import type { RecoverableCardPayment } from "@mgl/types";
import type { MinuTxnResult } from "./minu-pos-agent";

export class CardRecoveryError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CardRecoveryError";
  }
}

export function cardRecoveryDayRange(value: unknown): { gte: Date; lt: Date } {
  const date = typeof value === "string" ? value : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new CardRecoveryError(400, "Огноо YYYY-MM-DD хэлбэртэй байна.");
  const utc = new Date(`${date}T00:00:00Z`);
  if (
    !Number.isFinite(utc.getTime()) ||
    utc.toISOString().slice(0, 10) !== date
  )
    throw new CardRecoveryError(400, "Огноо буруу байна.");
  const gte = new Date(utc.getTime() - 8 * 60 * 60 * 1000);
  return { gte, lt: new Date(gte.getTime() + 24 * 60 * 60 * 1000) };
}

export function assertRecoverableCard(
  attempt: CardPaymentAttempt,
  scope: { organizationId: string; registerId: string; amount: number },
): string {
  if (
    attempt.organizationId !== scope.organizationId ||
    attempt.registerId !== scope.registerId
  )
    throw new CardRecoveryError(403, "Энэ кассын төлбөр биш байна.");
  if (attempt.saleReference || attempt.consumedAt)
    throw new CardRecoveryError(
      409,
      "Энэ төлбөрөөр борлуулалт бүртгэгдсэн байна. Борлуулалтын түүхээс баримтаа харна уу.",
    );
  if (
    !Number.isFinite(scope.amount) ||
    scope.amount <= 0 ||
    Math.round(Number(attempt.amount) * 100) !== Math.round(scope.amount * 100)
  )
    throw new CardRecoveryError(
      400,
      "Сагсны төлөх дүн картын гүйлгээний дүнтэй таарахгүй байна.",
    );
  const payload = attempt.providerPayload;
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    payload.provider !== "MINU_AGENT" ||
    typeof payload.invoice !== "string" ||
    !payload.invoice.trim()
  )
    throw new CardRecoveryError(400, "Minu төлбөрийн нэхэмжлэх олдсонгүй.");
  return payload.invoice;
}

export function assertMinuRecoveryPaid(
  result: MinuTxnResult,
  invoice: string,
): string {
  const rrn = String(result.entity?.rrn ?? "").trim();
  if (
    !result.approved ||
    !rrn ||
    (result.entity?.invoice && result.entity.invoice !== invoice)
  ) {
    throw new CardRecoveryError(
      409,
      `Minu төлбөрийг батлаагүй: ${result.message || "Төлбөрийн төлөв тодорхойгүй байна"}. Дахин карт уншуулахгүйгээр төлөвийг шалгана уу.`,
    );
  }
  return rrn;
}

export function toRecoverableCard(
  attempt: CardPaymentAttempt,
): RecoverableCardPayment {
  return {
    attemptId: attempt.id,
    amount: Number(attempt.amount),
    createdAt: attempt.createdAt.toISOString(),
    terminalId: attempt.terminalId,
    status: attempt.status,
    transactionId: attempt.traceno || attempt.transactionId,
  };
}
