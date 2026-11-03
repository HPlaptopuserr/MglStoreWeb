import { Router, type Router as ExpressRouter } from "express";
import { prisma, PosPaymentStatus } from "@mgl/database";
import {
  canAccessPosOrganization,
  requirePosUser,
  type AuthUser,
} from "./_shared";
import { getMinuAgentContextForRegister } from "../../../services/minu-register-context";
import { checkMinuAgentTransaction } from "../../../services/minu-pos-agent";
import {
  assertMinuRecoveryPaid,
  assertRecoverableCard,
  cardRecoveryDayRange,
  CardRecoveryError,
  toRecoverableCard,
} from "../../../services/card-payment-recovery";

const router: ExpressRouter = Router();

async function resolveRecoveryRegister(value: unknown, actor: AuthUser) {
  const registerId = typeof value === "string" ? value : "";
  const register = registerId
    ? await prisma.posRegister.findUnique({
        where: { id: registerId },
        select: {
          id: true,
          organizationId: true,
          isActive: true,
          mode: true,
          deletedAt: true,
          activationStatus: true,
        },
      })
    : null;
  if (
    !register ||
    !register.isActive ||
    register.deletedAt ||
    register.activationStatus !== "APPROVED" ||
    register.mode !== "RETAIL"
  ) {
    throw new CardRecoveryError(400, "Идэвхтэй дэлгүүрийн кассаа сонгоно уу.");
  }
  if (!canAccessPosOrganization(actor, register.organizationId))
    throw new CardRecoveryError(403, "Энэ кассын төлбөр ашиглах эрхгүй.");
  return register;
}

// Read/verify existing invoices only. These endpoints never authorize a new charge,
// create a sale, or adjust inventory. The standard sale transaction claims payment.
router.get("/pos/payments/card/recovery", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;
  res.setHeader("Cache-Control", "no-store");
  try {
    const register = await resolveRecoveryRegister(req.query.registerId, actor);
    const registerId = register.id;
    const attempts = await prisma.cardPaymentAttempt.findMany({
      where: {
        organizationId: register.organizationId,
        registerId,
        saleReference: null,
        consumedAt: null,
        createdAt: cardRecoveryDayRange(req.query.date),
        providerPayload: { path: ["provider"], equals: "MINU_AGENT" },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 101,
    });
    return res.json({
      payments: attempts.slice(0, 100).map(toRecoverableCard),
      truncated: attempts.length > 100,
    });
  } catch (error: unknown) {
    const status = error instanceof CardRecoveryError ? error.status : 500;
    return res.status(status).json({
      message:
        error instanceof CardRecoveryError
          ? error.message
          : "Картын гүйлгээнүүдийг авч чадсангүй. Дахин шалгана уу.",
    });
  }
});

router.post(
  "/pos/payments/card/recovery/:attemptId/verify",
  async (req, res) => {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    res.setHeader("Cache-Control", "no-store");
    try {
      const attemptId = String(req.params.attemptId || "");
      const register = await resolveRecoveryRegister(
        req.body?.registerId,
        actor,
      );
      const registerId = register.id;
      const attempt = await prisma.cardPaymentAttempt.findUnique({
        where: { id: attemptId },
      });
      if (!attempt)
        throw new CardRecoveryError(404, "Картын гүйлгээ олдсонгүй.");
      const invoice = assertRecoverableCard(attempt, {
        registerId,
        organizationId: register.organizationId,
        amount: Number(req.body?.amount),
      });
      const context = await getMinuAgentContextForRegister(registerId);
      if (!context)
        throw new CardRecoveryError(
          400,
          "Minu merchant тохиргоо бүрэн биш байна.",
        );
      const result = await checkMinuAgentTransaction(context, invoice);
      const rrn = assertMinuRecoveryPaid(result, invoice);
      const verified = await prisma.cardPaymentAttempt.updateMany({
        where: {
          id: attemptId,
          organizationId: register.organizationId,
          registerId,
          saleReference: null,
          consumedAt: null,
        },
        data: {
          status: PosPaymentStatus.APPROVED,
          transactionId: rrn,
          traceno: rrn,
          message: result.message || "Minu төлбөр баталгаажлаа",
        },
      });
      if (verified.count !== 1)
        throw new CardRecoveryError(
          409,
          "Төлбөрөөр борлуулалт бүртгэгдсэн байна. Түүхээ шинэчилнэ үү.",
        );
      return res.json({
        ...toRecoverableCard(attempt),
        status: "APPROVED",
        transactionId: rrn,
      });
    } catch (error: unknown) {
      const status = error instanceof CardRecoveryError ? error.status : 502;
      return res.status(status).json({
        message:
          error instanceof CardRecoveryError
            ? error.message
            : "Minu төлбөрийг шалгаж чадсангүй. Дахин мөнгө татахгүйгээр шалгалтыг давтана уу.",
      });
    }
  },
);

export default router;
