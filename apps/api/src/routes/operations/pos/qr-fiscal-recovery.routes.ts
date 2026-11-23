import { mapEbarimtReceipt } from "./sales.routes";
import { Router, type Router as ExpressRouter } from "express";
import { AuditAction, prisma, type Prisma } from "@mgl/database";
import { checkoutFromPayload } from "../../../services/pos-card-checkout";
import { requirePosUser, type AuthUser } from "./_shared";

const router: ExpressRouter = Router();
const canAccess = (actor: AuthUser, organizationId: string) =>
  actor.role === "ADMIN" || actor.role === "SUPER_ADMIN" || actor.organizationId === organizationId;
const asObject = (value: Prisma.JsonValue | null): Prisma.JsonObject =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

/** The sale, consumption and completedSale marker are committed atomically. */
router.get("/pos/payments/qpay/pending-receipts", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;
  const registerId = typeof req.query.registerId === "string" ? req.query.registerId.trim() : "";
  if (!registerId) return res.status(400).json({ message: "Касс сонгоно уу." });
  try {
    const register = await prisma.posRegister.findUnique({ where: { id: registerId }, select: { organizationId: true } });
    if (!register) return res.sendStatus(404);
    if (!canAccess(actor, register.organizationId)) return res.sendStatus(403);
    const pending = await prisma.$queryRaw<{ invoiceId: string; saleId: string }[]>`
      SELECT DISTINCT ON (s."id") q."id" AS "invoiceId", s."id" AS "saleId"
      FROM "QPayInvoice" q JOIN "PosSale" s
        ON s."organizationId" = q."organizationId" AND s."receiptNo" = q."saleReference"
      WHERE q."organizationId" = ${register.organizationId} AND q."registerId" = ${registerId}
        AND q."status" = 'PAID' AND q."consumedAt" IS NOT NULL
        AND q."webhookPayload" #>> '{completedSale,fiscalPending}' = 'true'
        AND s."ebarimtStatus" IS DISTINCT FROM 'SUCCESS'
      ORDER BY s."id", q."consumedAt" ASC LIMIT 25
    `;
    const receipts: { invoiceId: string; clientSaleId: string; receipt: Prisma.JsonValue; fiscalPending: true }[] = [];
    for (const pendingReceipt of pending) {
      const invoice = await prisma.qPayInvoice.findUnique({ where: { id: pendingReceipt.invoiceId } });
      if (!invoice) continue;
      const checkout = checkoutFromPayload(invoice.webhookPayload);
      if (!checkout) continue;
      const saved = await prisma.posSaleIdempotency.findUnique({ where: {
        organizationId_clientSaleId: { organizationId: register.organizationId, clientSaleId: checkout.clientSaleId },
      }, select: { response: true } });
      const response = saved ? asObject(saved.response) : {};
      if (response.id !== pendingReceipt.saleId || response.pending === true) continue;
      receipts.push({ invoiceId: invoice.id, clientSaleId: checkout.clientSaleId,
        receipt: saved!.response, fiscalPending: true });
    }
    res.setHeader("Cache-Control", "no-store");
    return res.json({ receipts });
  } catch {
    return res.status(503).json({ message: "QR борлуулалтын дутуу eBarimt-ийг сэргээж чадсангүй. Дахин оролдоно уу." });
  }
});

/** No expiring lease: an uncertain local fiscal dispatch must never be repeated
 * automatically on another terminal. The same durable request may resume its
 * saved local result; actual successful attachment is the completion proof. */
router.post("/pos/payments/qpay/pending-receipts/:invoiceId/claim", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;
  const invoiceId = String(req.params.invoiceId || "").trim();
  const requestId = typeof req.body?.requestId === "string" ? req.body.requestId : "";
  const saleId = typeof req.body?.saleId === "string" ? req.body.saleId.trim() : "";
  if (!saleId || !/^[a-zA-Z0-9-]{16,100}$/.test(requestId))
    return res.status(400).json({ message: "Борлуулалт болон баримтын хүсэлтийн дугаар шаардлагатай." });
  try {
    const invoice = await prisma.qPayInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice?.organizationId || !invoice.registerId || !invoice.consumedAt || !invoice.saleReference || invoice.status !== "PAID")
      return res.status(409).json({ message: "QR борлуулалт бүрэн бүртгэгдээгүй байна." });
    if (!canAccess(actor, invoice.organizationId)) return res.sendStatus(403);
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "PosSale" WHERE "id" = ${saleId} FOR UPDATE`;
      const sale = await tx.posSale.findUnique({ where: { id: saleId }, select: {
        id: true, organizationId: true, registerId: true, receiptNo: true, ebarimtStatus: true,
        ebarimtBillId: true, ebarimtReceiptId: true, ebarimtQrData: true, ebarimtLottery: true,
        ebarimtDate: true, ebarimtError: true, ebarimtPayload: true, ebarimtSyncedAt: true,
      } });
      if (!sale || sale.organizationId !== invoice.organizationId || sale.registerId !== invoice.registerId || sale.receiptNo !== invoice.saleReference)
        return { status: 409, body: { message: "QR төлбөр энэ борлуулалттай таарахгүй байна." } };
      if (sale.ebarimtStatus === "SUCCESS") {
        const checkout = checkoutFromPayload(invoice.webhookPayload);
        const saved = checkout ? await tx.posSaleIdempotency.findUnique({ where: {
          organizationId_clientSaleId: { organizationId: sale.organizationId, clientSaleId: checkout.clientSaleId },
        }, select: { response: true } }) : null;
        return { status: 200, body: { alreadyIssued: true,
          receipt: saved ? { ...asObject(saved.response), ebarimt: mapEbarimtReceipt(sale) } : null } };
      }
      const previous = await tx.auditLog.findFirst({ where: { action: AuditAction.POS_REGISTER_UPDATED, AND: [
        { meta: { path: ["event"], equals: "POS_FISCAL_DISPATCH_CLAIM" } },
        { meta: { path: ["saleId"], equals: sale.id } },
        { meta: { path: ["organizationId"], equals: sale.organizationId } },
      ] }, select: { id: true, userId: true, meta: true } });
      if (previous) {
        const metadata = asObject(previous.meta);
        if (metadata.requestId === requestId && previous.userId === actor.id)
          return { status: 200, body: { claimed: true, claimId: previous.id, resumed: true } };
        return { status: 409, body: { message: "Энэ борлуулалтын eBarimt хүсэлт өөр цонх эсвэл төхөөрөмж дээр эхэлсэн байна. Өмнөх баримтыг сэргээнэ үү; давхар баримт үүсгэхгүй." } };
      }
      const claim = await tx.auditLog.create({ data: { userId: actor.id, action: AuditAction.POS_REGISTER_UPDATED,
        meta: { event: "POS_FISCAL_DISPATCH_CLAIM", requestId, saleId: sale.id, invoiceId: invoice.id,
          organizationId: sale.organizationId, registerId: sale.registerId, claimedAt: new Date().toISOString() } } });
      return { status: 200, body: { claimed: true, claimId: claim.id, resumed: false } };
    });
    return res.status(result.status).json(result.body);
  } catch {
    return res.status(503).json({ message: "eBarimt хүсэлтийг найдвартай хадгалж чадсангүй. Дахин баримт үүсгэлгүй оролдоно уу." });
  }
});

export default router;
