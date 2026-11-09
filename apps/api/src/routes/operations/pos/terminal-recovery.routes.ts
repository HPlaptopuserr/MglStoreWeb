import { Router, type Router as ExpressRouter } from "express";
import { prisma, type Prisma } from "@mgl/database";
import type { CardPaymentAttempt } from "@prisma/client";
import type { TerminalCardPayment, TerminalCardRecoveryResult } from "@mgl/types";
import { canAccessPosOrganization, requirePosUser, type AuthUser } from "./_shared";
import { CardRecoveryError, toRecoverableCard } from "../../../services/card-payment-recovery";
import { reconcileMinuCardAttempt } from "../../../services/minu-card-reconciliation";
import { minuPendingPaymentMessage } from "../../../services/minu-pos-agent";

const router: ExpressRouter = Router();
const pendingGuard: Prisma.CardPaymentAttemptWhereInput = {
  status: { in: ["PENDING", "FAILED"] }, consumedAt: null, saleReference: null,
  AND: [
    { providerPayload: { path: ["provider"], equals: "MINU_AGENT" } },
    { providerPayload: { path: ["terminalGuardVersion"], equals: 1 } },
  ],
};

async function resolveTerminal(value: unknown, actor: AuthUser) {
  const register = typeof value === "string" && value
    ? await prisma.posRegister.findUnique({ where: { id: value } }) : null;
  if (!register || !register.isActive || register.deletedAt || register.activationStatus !== "APPROVED" || register.mode !== "RETAIL")
    throw new CardRecoveryError(400, "Идэвхтэй дэлгүүрийн кассаа сонгоно уу.");
  if (!canAccessPosOrganization(actor, register.organizationId))
    throw new CardRecoveryError(403, "Энэ кассын төлбөр шалгах эрхгүй.");
  if (!register.cardTerminalId)
    throw new CardRecoveryError(400, "Кассын картын терминал тохируулагдаагүй байна.");
  return { organizationId: register.organizationId, terminalId: register.cardTerminalId };
}

function toTerminalPayment(attempt: CardPaymentAttempt, registerName: string): TerminalCardPayment {
  const payload = attempt.providerPayload as Prisma.JsonObject | null;
  return {
    ...toRecoverableCard(attempt), status: attempt.status, registerId: attempt.registerId, registerName,
    invoice: typeof payload?.invoice === "string" ? payload.invoice : "",
    message: attempt.status === "PENDING" || attempt.status === "FAILED"
      ? minuPendingPaymentMessage(attempt.message) : attempt.message,
    blocksTerminal: !attempt.consumedAt && !attempt.saleReference &&
      ["PENDING", "FAILED"].includes(attempt.status) && payload?.terminalGuardVersion === 1,
  };
}

router.get("/pos/payments/card/terminal-recovery", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;
  res.setHeader("Cache-Control", "no-store");
  try {
    const scope = await resolveTerminal(req.query.registerId, actor);
    const attempts = await prisma.cardPaymentAttempt.findMany({
      where: { ...scope, consumedAt: null, saleReference: null,
        status: { in: ["PENDING", "FAILED", "APPROVED"] },
        providerPayload: { path: ["provider"], equals: "MINU_AGENT" },
        OR: [pendingGuard, { createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } }],
      },
      include: { register: { select: { name: true } } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 101,
    });
    return res.json({ payments: attempts.slice(0, 100).map(row => toTerminalPayment(row, row.register?.name ?? "Касс")), truncated: attempts.length > 100 });
  } catch (error: unknown) {
    return res.status(error instanceof CardRecoveryError ? error.status : 500).json({
      message: error instanceof CardRecoveryError ? error.message : "Терминалын гүйлгээнүүдийг авч чадсангүй. Дахин шалгана уу.",
    });
  }
});

// Inquiry only: no invoice, charge, manual override or inferred timeout cancellation.
router.post("/pos/payments/card/terminal-recovery/:attemptId/check", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;
  res.setHeader("Cache-Control", "no-store");
  try {
    const scope = await resolveTerminal(req.body?.registerId, actor);
    const id = String(req.params.attemptId);
    const attempt = await prisma.cardPaymentAttempt.findUnique({ where: { id } });
    if (!attempt) throw new CardRecoveryError(404, "Картын гүйлгээ олдсонгүй.");
    if (attempt.organizationId !== scope.organizationId || attempt.terminalId !== scope.terminalId)
      throw new CardRecoveryError(403, "Энэ терминалын гүйлгээ биш байна.");
    const payload = attempt.providerPayload as Prisma.JsonObject | null;
    if (payload?.provider !== "MINU_AGENT" || typeof payload.invoice !== "string" || !payload.invoice.trim())
      throw new CardRecoveryError(400, "Minu төлбөрийн нэхэмжлэх олдсонгүй.");
    try {
      await reconcileMinuCardAttempt(attempt);
    } catch {
      // A simultaneous successful inquiry/checkout wins over this failed request.
      const current = await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id } });
      if (!current.consumedAt && !current.saleReference && ["PENDING", "FAILED"].includes(current.status))
        throw new CardRecoveryError(502, "Minu-с эцсийн хариу авч чадсангүй. Түгжээ тайлагдаагүй. Холболт сэргэхэд дахин шалгана уу.");
    }
    const response = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${scope.organizationId}:${scope.terminalId}`}, 0))`;
      const current = await tx.cardPaymentAttempt.findUniqueOrThrow({ where: { id }, include: { register: { select: { name: true } } } });
      const outcome: TerminalCardRecoveryResult["outcome"] = current.consumedAt || current.saleReference ? "COMPLETED"
        : current.status === "APPROVED" ? "PAID" : current.status === "DECLINED" ? "RELEASED" : "PENDING";
      const remainingLocks = await tx.cardPaymentAttempt.count({ where: { ...scope, ...pendingGuard } });
      const message = outcome === "RELEASED"
        ? remainingLocks ? "Энэ гүйлгээ амжилтгүй болсон. Терминалын бусад хүлээгдэж буй гүйлгээг шалгана уу." : "Гүйлгээ амжилтгүй эсвэл цуцлагдсан нь батлагдлаа. Түгжээ тайлагдсан. Сагсаа шалгаад дахин төлбөр эхлүүлж болно."
        : outcome === "PAID" ? "Төлбөр батлагдсан байна. Дахин карт уншуулахгүй. Анхны сагсны борлуулалтыг дуусгана уу."
        : outcome === "COMPLETED" ? "Энэ төлбөрөөр борлуулалт бүртгэгдсэн байна. Баримтаа борлуулалтын түүхээс харна уу."
        : "Төлбөрийн төлөв тодорхойгүй тул түгжээ тайлагдаагүй. Терминал дээр үргэлжилж буй гүйлгээг цуцлаад дахин шалгана уу. Хариу өөрчлөгдөхгүй бол доорх нэхэмжлэхээр Minu-д шалгуулна уу.";
      await tx.auditLog.create({ data: { userId: actor.id, action: "PAYMENT_STATUS_CHANGED",
        meta: { source: "POS_TERMINAL_RECOVERY_CHECK", attemptId: id, ...scope, outcome, remainingLocks, status: current.status },
      } });
      return { payment: toTerminalPayment(current, current.register?.name ?? "Касс"), outcome, remainingLocks, message } satisfies TerminalCardRecoveryResult;
    });
    return res.json(response);
  } catch (error: unknown) {
    return res.status(error instanceof CardRecoveryError ? error.status : 502).json({
      message: error instanceof CardRecoveryError ? error.message : "Төлөв шалгалт дуусаагүй. Дахин мөнгө татахгүйгээр шалгалтыг давтана уу.",
    });
  }
});

export default router;
