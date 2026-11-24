import { AuditAction, prisma } from "@mgl/database";
import { releaseResolvedCheckoutReservation } from "./pos-card-checkout";

type CheckoutKey = { organizationId: string; clientSaleId: string };
let cursor: CheckoutKey | undefined;

/** Sweep all stores fairly; age only delays inspection, never proves payment failure. */
export async function reconcileResolvedPosReservations(): Promise<void> {
  const candidates = await prisma.posCardStockReservation.groupBy({
    by: ["organizationId", "clientSaleId"],
    where: {
      createdAt: { lt: new Date(Date.now() - 60_000) },
      ...(cursor ? { OR: [
        { organizationId: { gt: cursor.organizationId } },
        { organizationId: cursor.organizationId, clientSaleId: { gt: cursor.clientSaleId } },
      ] } : {}),
    },
    orderBy: [{ organizationId: "asc" }, { clientSaleId: "asc" }],
    take: 25,
  });
  for (const checkout of candidates) {
    try {
      await prisma.$transaction(async tx => {
        // Same organization lock as authorization: an in-flight payment cannot
        // insert its reservation/attempt between inspection and deletion.
        const released = await releaseResolvedCheckoutReservation(tx, checkout.organizationId, checkout.clientSaleId);
        if (released) await tx.auditLog.create({ data: {
          action: AuditAction.POS_REGISTER_UPDATED,
          meta: { event: "POS_RESOLVED_RESERVATION_RELEASED", ...checkout, released },
        } });
      });
    } catch {
      console.warn("[pos stock] Reservation reconciliation deferred", checkout);
    }
  }
  cursor = candidates.length === 25 ? candidates[candidates.length - 1] : undefined;
}
