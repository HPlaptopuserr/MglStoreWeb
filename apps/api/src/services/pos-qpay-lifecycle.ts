import { AuditAction, PosQPayStatus, prisma, type Prisma } from "@mgl/database";
import { calculatePosLineAmounts } from "@mgl/types";
import { cancelVerifiedUnpaidExpiredQr } from "./pos-expired-qr-cancellation";
import { checkoutFromPayload } from "./pos-card-checkout";
import { reconcilePosQrPayment } from "./pos-qpay-reconciliation";
import { executePosSale } from "../routes/operations/pos/sales.routes";
import { canOperatePos, type AuthUser } from "../routes/operations/pos/_shared";

const invoiceInclude = { register: { select: {
  qpayEnabled: true, qpayMerchantId: true, qpayTerminalId: true, ebarimtEnabled: true,
} } } as const;

type PosQrInvoice = Prisma.QPayInvoiceGetPayload<{ include: typeof invoiceInclude }>;
const jsonObject = (value: Prisma.JsonValue | null): Prisma.JsonObject =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

/** Never overwrite callback/consumption metadata using an earlier network snapshot. */
async function recordLifecycleCheck(invoiceId: string, change: Prisma.JsonObject) {
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "QPayInvoice" WHERE "id" = ${invoiceId} FOR UPDATE`;
    const current = await tx.qPayInvoice.findUnique({ where: { id: invoiceId } });
    if (!current || current.consumedAt || current.saleReference ||
        (current.status !== PosQPayStatus.PAID && jsonObject(current.webhookPayload).providerCancellationConfirmed === true)) return;
    await tx.qPayInvoice.update({ where: { id: invoiceId }, data: {
      webhookPayload: { ...jsonObject(current.webhookPayload), ...change },
    } });
  });
}

async function retainVerifiedUnpaidInvoice(invoice: PosQrInvoice, checkedAt: Date) {
  if (!invoice.organizationId || !invoice.registerId || invoice.expiresAt > checkedAt) return;
  const organizationId = invoice.organizationId;
  const registerId = invoice.registerId;
  const checkout = checkoutFromPayload(invoice.webhookPayload);
  if (!checkout) return;
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "QPayInvoice" WHERE "id" = ${invoice.id} FOR UPDATE`;
    const current = await tx.qPayInvoice.findUnique({ where: { id: invoice.id } });
    if (!current || current.paidAt || current.consumedAt || current.saleReference ||
        current.status === PosQPayStatus.PAID || current.organizationId !== invoice.organizationId ||
        current.registerId !== invoice.registerId || Number(current.amount) !== Number(invoice.amount)) return;
    const currentCheckout = checkoutFromPayload(current.webhookPayload);
    const originalPayload = jsonObject(invoice.webhookPayload);
    const currentPayload = jsonObject(current.webhookPayload);
    if (!currentCheckout || JSON.stringify(currentCheckout) !== JSON.stringify(checkout) ||
        currentPayload.providerInvoiceId !== originalPayload.providerInvoiceId ||
        currentPayload.merchantCode !== originalPayload.merchantCode) return;
    const payload = jsonObject(current.webhookPayload);
    if (payload.providerCancellationConfirmed === true) return;
    const previous = payload.paymentLifecycleReview;
    let archiveId = previous && typeof previous === "object" && !Array.isArray(previous) &&
      typeof previous.archiveId === "string" ? previous.archiveId : null;
    // The marker references immutable server evidence; an old basket review or
    // arbitrary JSON marker is never enough to change the shift guard.
    const existing = archiveId ? await tx.auditLog.findFirst({ where: {
      id: archiveId, action: AuditAction.POS_REGISTER_UPDATED, AND: [
        { meta: { path: ["event"], equals: "POS_EXPIRED_UNPAID_QR_REVIEW" } },
        { meta: { path: ["invoiceId"], equals: current.id } },
        { meta: { path: ["organizationId"], equals: organizationId } },
        { meta: { path: ["registerId"], equals: registerId } },
        { meta: { path: ["shiftId"], equals: checkout.shiftId } },
        { meta: { path: ["providerState"], equals: "UNPAID" } },
      ],
    }, select: { id: true } }) : null;
    if (!existing) {
      const archive = await tx.auditLog.create({ data: {
        userId: current.initiatedById, action: AuditAction.POS_REGISTER_UPDATED,
        meta: { event: "POS_EXPIRED_UNPAID_QR_REVIEW", organizationId: current.organizationId,
          registerId: current.registerId, shiftId: checkout.shiftId, invoiceId: current.id,
          amount: Number(current.amount), checkedAt: checkedAt.toISOString(),
          providerState: "UNPAID", bankCancellationConfirmed: false,
          requiresPaymentReconciliation: true, checkout: checkout as unknown as Prisma.JsonObject },
      } });
      archiveId = archive.id;
    }
    await tx.qPayInvoice.update({ where: { id: current.id }, data: {
      status: PosQPayStatus.EXPIRED,
      webhookPayload: { ...payload, requiresPaymentReconciliation: true,
        lastLifecycleCheckAt: checkedAt.toISOString(),
        paymentLifecycleReview: { archiveId, checkedAt: checkedAt.toISOString(), providerState: "UNPAID" } },
    } });
    // The bank has not cancelled this invoice. Keep its payment identity and
    // inventory reservation so a late approval remains recoverable.
  });
}

async function finalizeVerifiedQrInvoice(invoice: PosQrInvoice) {
  if (!invoice.organizationId || !invoice.registerId || !invoice.initiatedById ||
      invoice.consumedAt || invoice.saleReference) return;
  const checkout = checkoutFromPayload(invoice.webhookPayload);
  const review = async (reason: string) => recordLifecycleCheck(invoice.id, {
    autoFinalizeReviewRequired: reason, lastLifecycleCheckAt: new Date().toISOString(),
  });
  if (!checkout || checkout.autoFinalizeEligible !== true) {
    await review("ORIGINAL_CHECKOUT_CONTEXT_REQUIRED"); return;
  }
  const total = checkout.lines.reduce((sum, line) => sum + Math.round(calculatePosLineAmounts(line).lineTotal * 100), 0);
  if (total !== Math.round(Number(invoice.amount) * 100)) {
    await review("SPLIT_OR_ADJUSTED_PAYMENT_REQUIRES_ORIGINAL_CHECKOUT"); return;
  }
  const [otherQr, cards, user, member] = await Promise.all([
    prisma.qPayInvoice.count({ where: { id: { not: invoice.id }, organizationId: invoice.organizationId,
      webhookPayload: { path: ["checkout", "clientSaleId"], equals: checkout.clientSaleId } } }),
    prisma.cardPaymentAttempt.count({ where: { organizationId: invoice.organizationId,
      providerPayload: { path: ["checkout", "clientSaleId"], equals: checkout.clientSaleId } } }),
    prisma.user.findUnique({ where: { id: invoice.initiatedById }, select: { id: true, role: true, isActive: true, deletedAt: true } }),
    prisma.organizationMember.findFirst({ where: { userId: invoice.initiatedById, organizationId: invoice.organizationId,
      isActive: true, deletedAt: null }, select: { role: true, capabilities: true } }),
  ]);
  if (otherQr || cards || !user || !user.isActive || user.deletedAt || !member) {
    await review("PAYMENT_OR_CASHIER_CONTEXT_REQUIRES_REVIEW"); return;
  }
  const actor: AuthUser = { ...user, organizationId: invoice.organizationId,
    orgRole: member.role, capabilities: member.capabilities };
  if (!canOperatePos(actor)) { await review("CASHIER_ACCESS_REQUIRES_REVIEW"); return; }
  const result = await executePosSale({
    organizationId: invoice.organizationId, registerId: invoice.registerId,
    branchId: checkout.branchId, shiftId: checkout.shiftId, clientSaleId: checkout.clientSaleId,
    lines: checkout.lines, paymentMethod: "QPAY",
    paymentBreakdown: [{ method: "QPAY", amount: Number(invoice.amount), invoiceId: invoice.id }],
    loyalty: { mode: "NONE" },
  }, actor, undefined, { verifiedQrInvoiceId: invoice.id });
  if (result.status < 200 || result.status >= 300) {
    await review("ORIGINAL_SALE_VALIDATION_REQUIRES_RETRY"); return;
  }

}

const inFlight = new Map<string, Promise<void>>();
export function processPosQrInvoiceLifecycle(invoiceId: string): Promise<void> {
  const existing = inFlight.get(invoiceId);
  if (existing) return existing;
  const work = (async () => {
    let invoice = await prisma.qPayInvoice.findUnique({ where: { id: invoiceId }, include: invoiceInclude });
    if (!invoice || invoice.consumedAt || invoice.saleReference) return;
    // Explicit bank cancellation is terminal for background/status observation.
    // A separate authenticated callback may still prove a genuinely late payment.
    if (invoice.status !== PosQPayStatus.PAID &&
        jsonObject(invoice.webhookPayload).providerCancellationConfirmed === true) return;
    if (!checkoutFromPayload(invoice.webhookPayload)) {
      await recordLifecycleCheck(invoice.id, { autoFinalizeReviewRequired: "FROZEN_CHECKOUT_REQUIRED",
        lastLifecycleCheckAt: new Date().toISOString() });
      return;
    }
    if (invoice.status !== PosQPayStatus.PAID) {
      const result = await reconcilePosQrPayment(invoice);
      if (result.state === "UNPAID" && invoice.expiresAt <= new Date()) {
        await retainVerifiedUnpaidInvoice(invoice, new Date());
        await cancelVerifiedUnpaidExpiredQr(invoice);
        return;
      }
      if (result.state !== "PAID") {
        await recordLifecycleCheck(invoice.id, { lastLifecycleCheckAt: new Date().toISOString() }); return;
      }
      invoice = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: invoice.id }, include: invoiceInclude });
    }
    // Give the original browser a short window to commit its complete customer
    // context; the durable worker completes plain QR baskets if it goes offline.
    if (!invoice.paidAt || Date.now() - invoice.paidAt.getTime() < 15_000) return;
    await finalizeVerifiedQrInvoice(invoice);
  })().finally(() => { inFlight.delete(invoiceId); });
  inFlight.set(invoiceId, work);
  return work;
}

/** Independent bounded lanes prevent old unpaid reviews starving new payments. */
export async function reconcilePendingPosQrPayments(): Promise<void> {
  const now = Date.now();
  const lane = async (status: PosQPayStatus, cooldown: number) => prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "QPayInvoice"
    WHERE "status" = ${status}::"PosQPayStatus"
      AND "consumedAt" IS NULL AND "saleReference" IS NULL
      AND "organizationId" IS NOT NULL AND "registerId" IS NOT NULL
      AND "webhookPayload" #>> '{checkout,shiftId}' IS NOT NULL
      AND ("status" = 'PAID' OR COALESCE("webhookPayload" ->> 'providerCancellationConfirmed', 'false') <> 'true')
      AND "updatedAt" < ${new Date(now - cooldown)}
    ORDER BY "updatedAt" ASC, "id" ASC LIMIT 8
  `;
  const batches = await Promise.all([
    lane(PosQPayStatus.PAID, 15_000), lane(PosQPayStatus.PENDING, 15_000), lane(PosQPayStatus.EXPIRED, 300_000),
  ]);
  const candidates = batches.flat();
  for (let offset = 0; offset < candidates.length; offset += 3) {
    await Promise.all(candidates.slice(offset, offset + 3).map(async ({ id }) => {
      try { await processPosQrInvoiceLifecycle(id); }
      catch {
        console.warn("[pos qr] Payment reconciliation deferred", { invoiceId: id });
        await prisma.qPayInvoice.updateMany({ where: { id, consumedAt: null, saleReference: null }, data: { updatedAt: new Date() } });
      }
    }));
  }
}
