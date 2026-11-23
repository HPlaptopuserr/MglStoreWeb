import { AuditAction, PosQPayStatus, prisma, type Prisma } from "@mgl/database";
import { reconcilePosQrPayment } from "./pos-qpay-reconciliation";

type ShiftQrScope = { id: string; organizationId: string; registerId: string };
export type UnpaidShiftQrProof = {
  invoiceId: string;
  updatedAt: Date;
  checkedAt: Date;
};

/** Network checks happen before acquiring the shift's accounting lock. */
export async function checkExpiredShiftQrPayments(
  shift: ShiftQrScope,
): Promise<UnpaidShiftQrProof[]> {
  const invoices = await prisma.qPayInvoice.findMany({
    where: {
      organizationId: shift.organizationId,
      registerId: shift.registerId,
      consumedAt: null,
      saleReference: null,
      status: { in: [PosQPayStatus.PENDING, PosQPayStatus.EXPIRED] },
      expiresAt: { lte: new Date() },
      webhookPayload: { path: ["checkout", "shiftId"], equals: shift.id },
    },
    include: { register: { select: { qpayEnabled: true, qpayMerchantId: true, qpayTerminalId: true } } },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  const proofs: UnpaidShiftQrProof[] = [];
  for (const invoice of invoices) {
    const payload = invoice.webhookPayload as Prisma.JsonObject | null;
    // Already cancelled invoices require no provider request. A review archive
    // alone is not evidence; the provider is checked again for every close.
    if (payload?.providerCancellationConfirmed === true) continue;
    try {
      const result = await reconcilePosQrPayment(invoice);
      if (result.state === "UNPAID") {
        proofs.push({ invoiceId: invoice.id, updatedAt: invoice.updatedAt, checkedAt: new Date() });
      }
    } catch {
      const error = new Error("QR төлбөрийн банкны төлөвийг шалгаж чадсангүй. Ээлж нээлттэй хэвээр байна; дахин оролдоно уу.");
      Object.assign(error, { status: 503 });
      throw error;
    }
  }
  return proofs;
}

/** Retain the invoice and its stock reservation for possible late settlement.
 * This is an unpaid review record, never a claim of bank cancellation. */
export async function archiveUnpaidShiftQrPayments(
  tx: Prisma.TransactionClient,
  shift: ShiftQrScope,
  proofs: UnpaidShiftQrProof[],
  actorId: string,
): Promise<number> {
  let count = 0;
  for (const proof of proofs) {
    const current = await tx.qPayInvoice.findFirst({ where: {
      id: proof.invoiceId, organizationId: shift.organizationId, registerId: shift.registerId,
      consumedAt: null, saleReference: null,
      status: { in: [PosQPayStatus.PENDING, PosQPayStatus.EXPIRED] },
      updatedAt: proof.updatedAt, expiresAt: { lte: proof.checkedAt },
      webhookPayload: { path: ["checkout", "shiftId"], equals: shift.id },
    } });
    if (!current) continue;
    const archive = await tx.auditLog.create({ data: {
      userId: actorId, action: AuditAction.POS_REGISTER_UPDATED,
      meta: { event: "POS_SHIFT_UNPAID_QR_REVIEW", organizationId: shift.organizationId,
        registerId: shift.registerId, shiftId: shift.id, invoiceId: current.id,
        amount: Number(current.amount), checkedAt: proof.checkedAt.toISOString(),
        providerState: "UNPAID", bankCancellationConfirmed: false,
        requiresPaymentReconciliation: true },
    } });
    const updated = await tx.qPayInvoice.updateMany({ where: {
      id: current.id, updatedAt: proof.updatedAt, consumedAt: null, saleReference: null,
      status: { in: [PosQPayStatus.PENDING, PosQPayStatus.EXPIRED] },
    }, data: {
      status: PosQPayStatus.EXPIRED,
      webhookPayload: {
        ...(current.webhookPayload as Prisma.JsonObject),
        requiresPaymentReconciliation: true,
        shiftCloseReview: { shiftId: shift.id, archiveId: archive.id,
          checkedAt: proof.checkedAt.toISOString(), providerState: "UNPAID" },
      },
    } });
    count += updated.count;
  }
  return count;
}
