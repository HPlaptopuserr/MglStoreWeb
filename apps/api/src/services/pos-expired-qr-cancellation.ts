import { AuditAction, PosQPayStatus, prisma, type Prisma } from "@mgl/database";
import { checkoutFromPayload, isQrCancellationConfirmed, releaseResolvedCheckoutReservation, sameCheckout } from "./pos-card-checkout";
import { resolveSystemQrConfig, isSystemQrAuthenticationError, type ReconciliablePosQPayInvoice } from "./pos-qpay-reconciliation";
import { usesOrganizationMerchant } from "./pos-merchant-scope";
import { cancelSystemQrInvoice } from "./systemqr";
import { lockOrganizationInventory } from "./vendor-inventory-warehouse.service";

const jsonObject = (value: Prisma.JsonValue | null): Prisma.JsonObject =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

/** Caller must first obtain fresh, verified UNPAID evidence from the bank. */
export async function cancelVerifiedUnpaidExpiredQr(
  invoice: ReconciliablePosQPayInvoice & { expiresAt: Date },
): Promise<void> {
  const checkout = checkoutFromPayload(invoice.webhookPayload);
  const payload = jsonObject(invoice.webhookPayload);
  const organizationId = invoice.organizationId;
  const providerInvoiceId = typeof payload.providerInvoiceId === "string" ? payload.providerInvoiceId.trim() : "";
  if (!organizationId || !checkout || invoice.expiresAt > new Date() ||
      (invoice.status !== PosQPayStatus.PENDING && invoice.status !== PosQPayStatus.EXPIRED) ||
      payload.provider !== "SYSTEMQR" || !providerInvoiceId || isQrCancellationConfirmed(payload)) return;
  // Re-read before bank I/O: payment/cancellation may have completed during the check.
  const latest = await prisma.qPayInvoice.findUnique({ where: { id: invoice.id } });
  if (!latest || latest.paidAt || latest.consumedAt || latest.saleReference || latest.status === PosQPayStatus.PAID ||
      latest.expiresAt > new Date() || isQrCancellationConfirmed(latest.webhookPayload)) return;
  const latestPayload = jsonObject(latest.webhookPayload);
  const latestCheckout = checkoutFromPayload(latest.webhookPayload);
  if (latest.organizationId !== organizationId || !latestCheckout || !sameCheckout(latestCheckout, checkout) ||
      latestPayload.providerInvoiceId !== payload.providerInvoiceId || latestPayload.provider !== payload.provider ||
      latestPayload.merchantCode !== payload.merchantCode || Number(latest.amount) !== Number(invoice.amount)) return;
  const resolved = await resolveSystemQrConfig(organizationId,
    usesOrganizationMerchant(payload) ? null : invoice.register);
  const merchantCode = String(payload.merchantCode || resolved?.merchantCode || "").trim();
  if (!merchantCode) return;
  try {
    await cancelSystemQrInvoice({ merchantCode, invoiceNumber: providerInvoiceId }, resolved?.username, resolved?.password);
  } catch (error: unknown) {
    if (!resolved?.password || !isSystemQrAuthenticationError(error)) throw error;
    await cancelSystemQrInvoice({ merchantCode, invoiceNumber: providerInvoiceId });
  }
  await prisma.$transaction(async tx => {
    await lockOrganizationInventory(tx, organizationId);
    await tx.$queryRaw`SELECT "id" FROM "QPayInvoice" WHERE "id" = ${invoice.id} FOR UPDATE`;
    const current = await tx.qPayInvoice.findUnique({ where: { id: invoice.id } });
    if (!current || current.status === PosQPayStatus.PAID || current.paidAt || current.consumedAt || current.saleReference ||
        current.organizationId !== organizationId || current.expiresAt > new Date()) return;
    const currentPayload = jsonObject(current.webhookPayload);
    const currentCheckout = checkoutFromPayload(current.webhookPayload);
    if (!currentCheckout || !sameCheckout(checkout, currentCheckout) ||
        currentPayload.providerInvoiceId !== payload.providerInvoiceId || currentPayload.provider !== payload.provider ||
        currentPayload.merchantCode !== payload.merchantCode || isQrCancellationConfirmed(currentPayload)) return;
    await tx.qPayInvoice.update({ where: { id: current.id }, data: {
      status: PosQPayStatus.EXPIRED,
      webhookPayload: { ...currentPayload, providerCancellationConfirmed: true,
        cancelledAt: new Date().toISOString(), cancelReason: "EXPIRED_UNPAID_AUTO_CANCEL" },
    } });
    const released = await releaseResolvedCheckoutReservation(tx, organizationId, checkout.clientSaleId);
    await tx.auditLog.create({ data: {
      action: AuditAction.POS_REGISTER_UPDATED,
      meta: { event: "POS_EXPIRED_UNPAID_QR_CANCELLED", invoiceId: current.id,
        organizationId: current.organizationId, clientSaleId: checkout.clientSaleId, released },
    } });
  });
}
