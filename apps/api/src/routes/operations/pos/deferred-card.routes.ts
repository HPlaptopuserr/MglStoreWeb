import { Router, type Router as ExpressRouter } from "express";
import { prisma, Prisma } from "@mgl/database";
import type { CardPaymentAttempt } from "@prisma/client";
import type { DeferredCardCheckout } from "@mgl/types";
import { canAccessPosOrganization, requirePosUser, type AuthUser } from "./_shared";
import { CardRecoveryError } from "../../../services/card-payment-recovery";

const router: ExpressRouter = Router();
const object = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

function deferred(attempt: CardPaymentAttempt): DeferredCardCheckout | null {
  const saved = object(object(attempt.providerPayload)?.deferredCheckout);
  if (!saved || (saved.kind !== "RETAIL" && saved.kind !== "SELF_SERVICE") ||
      typeof saved.snapshot !== "string" || typeof saved.clientSaleId !== "string") return null;
  return { attemptId: attempt.id, amount: Number(attempt.amount), terminalId: attempt.terminalId,
    status: attempt.status, transactionId: attempt.transactionId, createdAt: attempt.createdAt.toISOString(),
    kind: saved.kind, clientSaleId: saved.clientSaleId, snapshot: saved.snapshot };
}

async function registerFor(value: unknown, actor: AuthUser) {
  const register = typeof value === "string" ? await prisma.posRegister.findUnique({ where: { id: value } }) : null;
  if (!register || register.deletedAt || !register.isActive || register.activationStatus !== "APPROVED")
    throw new CardRecoveryError(400, "Идэвхтэй кассаа сонгоно уу.");
  if (!canAccessPosOrganization(actor, register.organizationId)) throw new CardRecoveryError(403, "Энэ кассын төлбөрт хандах эрхгүй.");
  return register;
}

router.get("/pos/payments/card/deferred", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;
  res.setHeader("Cache-Control", "no-store");
  try {
    const register = await registerFor(req.query.registerId, actor);
    const attempts = await prisma.cardPaymentAttempt.findMany({ where: {
      registerId: register.id, organizationId: register.organizationId, consumedAt: null, saleReference: null,
      providerPayload: { path: ["deferredCheckout", "active"], equals: true },
    }, orderBy: { createdAt: "asc" }, take: 100 });
    return res.json({ checkouts: attempts.map(deferred).filter(item => item !== null) });
  } catch (error: unknown) {
    return res.status(error instanceof CardRecoveryError ? error.status : 500).json({
      message: error instanceof CardRecoveryError ? error.message : "Хүлээгдэж буй сагсыг авч чадсангүй.",
    });
  }
});

// Save before releasing the browser checkout. Financial status, invoice, terminal
// guard and stock reservation remain unchanged. No provider request is made here.
router.post("/pos/payments/card/deferred/:attemptId", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;
  try {
    const register = await registerFor(req.body?.registerId, actor);
    const attemptId = String(req.params.attemptId);
    const result = await prisma.$transaction(async tx => {
      const original = await tx.cardPaymentAttempt.findUnique({ where: { id: attemptId } });
      if (!original || original.organizationId !== register.organizationId || original.registerId !== register.id)
        throw new CardRecoveryError(404, "Төлбөр олдсонгүй.");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${original.organizationId}:${original.terminalId}`}, 0))`;
      const attempt = await tx.cardPaymentAttempt.findUniqueOrThrow({ where: { id: attemptId } });
      const payload = object(attempt.providerPayload);
      if (payload?.provider !== "MINU_AGENT" || attempt.consumedAt || attempt.saleReference)
        throw new CardRecoveryError(409, "Энэ төлбөрийг хүлээлгэх боломжгүй.");
      const existing = deferred(attempt);
      if (req.body?.resume === true) {
        if (!existing || attempt.status !== "DECLINED")
          throw new CardRecoveryError(409, "Зөвхөн амжилтгүй болсон төлбөрийн сагсыг жагсаалтаас гаргана.");
        // The caller durably restores the original checkout before acknowledging.
        await tx.cardPaymentAttempt.update({ where: { id: attemptId }, data: {
          providerPayload: { ...payload, deferredCheckout: { ...object(payload.deferredCheckout), active: false, resumedAt: new Date().toISOString(), resumedById: actor.id } } as Prisma.InputJsonObject,
        } });
        return existing;
      }
      if (existing) return existing;
      const { kind, snapshot, clientSaleId } = req.body as Record<string, unknown>;
      if ((kind !== "RETAIL" && kind !== "SELF_SERVICE") || typeof snapshot !== "string" || snapshot.length > 250_000 ||
          typeof clientSaleId !== "string" || !clientSaleId || clientSaleId.length > 200)
        throw new CardRecoveryError(400, "Сагсны мэдээлэл буруу байна.");
      let data: Record<string, unknown> | null;
      try { data = object(JSON.parse(snapshot)); } catch { data = null; }
      const checkout = kind === "RETAIL" ? data : object(data?.checkout);
      const entries = checkout?.paymentEntries;
      const matches = kind === "RETAIL"
        ? Array.isArray(entries) && entries.some(entry => object(entry)?.attemptId === attemptId)
        : object(checkout?.cardAttempt)?.attemptId === attemptId;
      if (!checkout || checkout.clientSaleId !== clientSaleId || !matches ||
          (kind === "RETAIL" && (register.mode !== "RETAIL" || object(payload.checkout)?.clientSaleId !== clientSaleId)) ||
          (kind === "SELF_SERVICE" && (register.mode !== "SELF_SERVICE" || data?.registerId !== register.id || data?.organizationId !== register.organizationId)))
        throw new CardRecoveryError(409, "Сагс төлбөртэй таарахгүй байна.");
      const restaurantTicketId = kind === "SELF_SERVICE" ? object(checkout.ticket)?.id : undefined;
      if (kind === "SELF_SERVICE") {
        const ticket = typeof restaurantTicketId === "string" ? await tx.restaurantTicket.findFirst({ where: {
          id: restaurantTicketId, organizationId: register.organizationId, branchId: register.branchId, posSaleId: null,
        } }) : null;
        if (!ticket || (object(payload.saleIdentity)?.restaurantTicketId && object(payload.saleIdentity)?.restaurantTicketId !== restaurantTicketId))
          throw new CardRecoveryError(409, "Захиалга төлбөртэй таарахгүй байна.");
      }
      const saved = await tx.cardPaymentAttempt.update({ where: { id: attemptId }, data: {
        providerPayload: { ...payload, deferredCheckout: { kind, clientSaleId, snapshot, active: true, savedAt: new Date().toISOString(), savedById: actor.id, ...(typeof restaurantTicketId === "string" ? { restaurantTicketId } : {}) } } as Prisma.InputJsonObject,
      } });
      return deferred(saved);
    });
    return res.json(result);
  } catch (error: unknown) {
    return res.status(error instanceof CardRecoveryError ? error.status : 500).json({
      message: error instanceof CardRecoveryError ? error.message : "Сагсыг хадгалж чадсангүй. Одоогийн сагс хадгалагдсан хэвээр байна.",
    });
  }
});

export default router;
