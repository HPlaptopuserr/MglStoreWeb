import { lockCardRequest, missingCardAttemptIds } from "./missing-card-attempt-archive";
import { createHash } from "node:crypto";
import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { canAccessPosOrganization, requirePosUser } from "./_shared";

class ExistingPaymentEvidence extends Error {}

const router: ExpressRouter = Router();
const event = "CHECKOUT_RECOVERY_ARCHIVED";
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// Preserve an unusable local checkout before the browser detaches its active slot.
// This endpoint never cancels, consumes, approves or otherwise changes a payment.
router.post("/pos/payments/recovery/archive", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;
  res.setHeader("Cache-Control", "no-store");
  const body: unknown = req.body;
  if (!object(body) || typeof body.organizationId !== "string" ||
      typeof body.registerId !== "string" || typeof body.snapshot !== "string" ||
      !body.snapshot || Buffer.byteLength(body.snapshot, "utf8") > 120_000 ||
      !["INVALID_SNAPSHOT", "EMPTY_CART_PAYMENT", "MISSING_CARD_ATTEMPT"].includes(String(body.reason)) ||
      !(body.clientSaleId === null || (typeof body.clientSaleId === "string" && body.clientSaleId.length <= 200))) {
    return res.status(400).json({ message: "Хадгалах төлбөрийн мэдээлэл буруу байна." });
  }
  if (!canAccessPosOrganization(actor, body.organizationId)) {
    return res.status(403).json({ message: "Энэ кассын төлбөрийг хадгалах эрхгүй." });
  }
  const { organizationId, registerId, snapshot, clientSaleId } = body;
  const missingAttemptIds = body.reason === "MISSING_CARD_ATTEMPT"
    ? missingCardAttemptIds(snapshot, clientSaleId, registerId) : null;
  if (body.reason === "MISSING_CARD_ATTEMPT" && !missingAttemptIds) {
    return res.status(400).json({ message: "Зөвхөн серверт үүсээгүй, хүлээгдэж буй картын хүсэлтүүдийг тусад нь хадгална." });
  }
  try {
    const register = await prisma.posRegister.findUnique({ where: { id: registerId },
      select: { organizationId: true, deletedAt: true, isActive: true, activationStatus: true } });
    if (!register || register.organizationId !== organizationId || register.deletedAt ||
        !register.isActive || register.activationStatus !== "APPROVED") {
      return res.status(403).json({ message: "Идэвхтэй кассын мэдээлэл таарахгүй байна." });
    }
    const snapshotHash = createHash("sha256").update(snapshot).digest("hex");
    const archive = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`checkout-archive:${organizationId}:${registerId}:${snapshotHash}`}, 0))`;
      if (missingAttemptIds) {
        for (const id of missingAttemptIds) await lockCardRequest(tx, id);
        await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
        // IDs are checked globally: a foreign or already consumed attempt is still real money evidence.
        const realAttempt = await tx.cardPaymentAttempt.findFirst({ where: { id: { in: missingAttemptIds } }, select: { id: true } });
        const relatedCard = await tx.cardPaymentAttempt.findFirst({ where: {
          organizationId,
          OR: ["checkout", "saleIdentity", "deferredCheckout"].map(key => ({
            providerPayload: { path: [key, "clientSaleId"], equals: String(clientSaleId) },
          })),
        }, select: { id: true } });
        const relatedQr = await tx.qPayInvoice.findFirst({ where: { organizationId,
          webhookPayload: { path: ["checkout", "clientSaleId"], equals: String(clientSaleId) },
        }, select: { id: true } });
        const completedSale = await tx.posSaleIdempotency.findFirst({ where: { organizationId, clientSaleId: String(clientSaleId) }, select: { id: true } });
        if (realAttempt || relatedCard || relatedQr || completedSale) {
          throw new ExistingPaymentEvidence();
        }
      }
      const existing = await tx.auditLog.findFirst({ where: {
        action: "POS_REGISTER_UPDATED",
        AND: [
          { meta: { path: ["event"], equals: event } },
          { meta: { path: ["organizationId"], equals: organizationId } },
          { meta: { path: ["registerId"], equals: registerId } },
          { meta: { path: ["snapshotHash"], equals: snapshotHash } },
          ...(missingAttemptIds ? [{ meta: { path: ["reason"], equals: "MISSING_CARD_ATTEMPT" } }] : []),
        ],
      }, select: { id: true } });
      if (existing) return existing;
      return tx.auditLog.create({ data: { userId: actor.id, action: "POS_REGISTER_UPDATED",
        meta: { event, organizationId, registerId, snapshotHash, snapshot,
          clientSaleId, reason: String(body.reason), reviewRequired: true,
          ...(missingAttemptIds ? { missingAttemptIds } : {}),
          financialStateUnchanged: true } }, select: { id: true } });
    });
    return res.json({ archiveId: archive.id });
  } catch (error: unknown) {
    if (error instanceof ExistingPaymentEvidence) {
      return res.status(409).json({ message: "Энэ сагстай холбоотой төлбөр эсвэл борлуулалт серверт байна. Төлөвийг тулгаж шалгана уу; мэдээллийг тусгаарлаагүй." });
    }
    return res.status(503).json({ message: "Өмнөх төлбөрийг найдвартай хадгалж чадсангүй. Мэдээллийг устгахгүйгээр дахин оролдоно уу." });
  }
});

export default router;
