import { AuditAction, PosQPayStatus, prisma, type Prisma } from "@mgl/database";
import { checkoutFromPayload, isQrCancellationConfirmed, releaseResolvedCheckoutReservation, sameCheckout } from "./pos-card-checkout";
import { resolveSystemQrConfig, isSystemQrAuthenticationError, reconcilePosQrPayment, type ReconciliablePosQPayInvoice } from "./pos-qpay-reconciliation";
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
  let cancellationConfirmed = false;
  try {
    try {
      await cancelSystemQrInvoice({ merchantCode, invoiceNumber: providerInvoiceId }, resolved?.username, resolved?.password);
    } catch (error: unknown) {
      if (!resolved?.password || !isSystemQrAuthenticationError(error)) throw error;
      await cancelSystemQrInvoice({ merchantCode, invoiceNumber: providerInvoiceId });
    }
    cancellationConfirmed = true;
  } catch (error: unknown) {
    // Bank cancellation is independent of inventory hold expiry. Check again
    // AFTER the failed request; never release using only the earlier snapshot.
    if ((await reconcilePosQrPayment(invoice)).state !== "UNPAID") throw error;
  }
  await prisma.$transaction(async tx => {
    await lockOrganizationInventory(tx, organizationId);
    await tx.$queryRaw`SELECT "id" FROM "QPayInvoice" WHERE "id" = ${invoice.id} FOR UPDATE`;
    const current = await tx.qPayInvoice.findUnique({ where: { id: invoice.id } });
    if (!current || current.status === PosQPayStatus.PAID || current.paidAt || current.consumedAt || current.saleReference ||
        current.organizationId !== organizationId || current.expiresAt > new Date() ||
        Number(current.amount) !== Number(invoice.amount)) return;
    const currentPayload = jsonObject(current.webhookPayload);
    const currentCheckout = checkoutFromPayload(current.webhookPayload);
    if (!currentCheckout || !sameCheckout(checkout, currentCheckout) ||
        currentPayload.providerInvoiceId !== payload.providerInvoiceId || currentPayload.provider !== payload.provider ||
        currentPayload.merchantCode !== payload.merchantCode || isQrCancellationConfirmed(currentPayload)) return;
    const checkedAt = new Date().toISOString();
    const audit = !cancellationConfirmed ? await tx.auditLog.create({ data: {
      action: AuditAction.POS_REGISTER_UPDATED,
      meta: { event: "POS_EXPIRED_UNPAID_QR_INVENTORY_RELEASE", invoiceId: current.id,
        organizationId, clientSaleId: checkout.clientSaleId, providerInvoiceId, merchantCode,
        amount: Number(current.amount), expiresAt: current.expiresAt.toISOString(),
        providerState: "UNPAID", checkedAt, providerCancellationConfirmed: false },
    } }) : null;
    await tx.qPayInvoice.update({ where: { id: current.id }, data: {
      status: PosQPayStatus.EXPIRED,
      webhookPayload: audit
        ? { ...currentPayload, inventoryReleaseAuditId: audit.id,
            inventoryHoldExpiredAt: checkedAt, providerCancellationConfirmed: false,
            requiresPaymentReconciliation: true, lastLifecycleCheckAt: checkedAt }
        : { ...currentPayload, providerCancellationConfirmed: true,
            cancelledAt: checkedAt, cancelReason: "EXPIRED_UNPAID_AUTO_CANCEL" },
    } });
    const released = await releaseResolvedCheckoutReservation(tx, organizationId, checkout.clientSaleId);
    await tx.auditLog.create({ data: {
      action: AuditAction.POS_REGISTER_UPDATED,
      meta: { event: cancellationConfirmed ? "POS_EXPIRED_UNPAID_QR_CANCELLED" : "POS_EXPIRED_UNPAID_QR_STOCK_RELEASED",
        invoiceId: current.id, organizationId: current.organizationId,
        clientSaleId: checkout.clientSaleId, released, providerCancellationConfirmed: cancellationConfirmed },
    } });
  });
}
