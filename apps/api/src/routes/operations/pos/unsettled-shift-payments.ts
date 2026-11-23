import type { Prisma } from "@mgl/database";

type ShiftPaymentScope = {
  id: string;
  organizationId: string;
  registerId: string;
  cashierId: string;
  openedAt: Date;
};

/** Legacy evidence is scoped to this cashier's current register session only. */
export async function loadUnsettledShiftPayments(
  tx: Pick<Prisma.TransactionClient, "$queryRaw">,
  shift: ShiftPaymentScope,
): Promise<{ cardCount: number; qrCount: number }> {
  const [result] = await tx.$queryRaw<{ cardCount: bigint; qrCount: bigint }[]>`
    SELECT
      (SELECT COUNT(*) FROM "CardPaymentAttempt"
       WHERE "organizationId" = ${shift.organizationId}
         AND "registerId" = ${shift.registerId}
         AND "consumedAt" IS NULL AND "saleReference" IS NULL
         AND (
           ("status" IN ('PENDING', 'FAILED', 'APPROVED')
            AND "providerPayload" #>> '{checkout,shiftId}' = ${shift.id})
           OR ("status" = 'APPROVED'
               AND "providerPayload" #>> '{checkout,shiftId}' IS NULL
               AND ("createdAt" AT TIME ZONE 'UTC') >= ${shift.openedAt}
               AND "initiatedById" = ${shift.cashierId})
         )) AS "cardCount",
      (SELECT COUNT(*) FROM "QPayInvoice"
       WHERE "organizationId" = ${shift.organizationId}
         AND "registerId" = ${shift.registerId}
         AND "consumedAt" IS NULL AND "saleReference" IS NULL
         AND (
           (("status" IN ('PENDING', 'PAID') OR
             ("status" = 'EXPIRED'
              AND COALESCE("webhookPayload" ->> 'providerCancellationConfirmed', 'false') <> 'true'
              AND NOT EXISTS (
                SELECT 1 FROM "AuditLog" a
                WHERE a.id = "QPayInvoice"."webhookPayload" #>> '{shiftCloseReview,archiveId}'
                  AND a.meta ->> 'event' = 'POS_SHIFT_UNPAID_QR_REVIEW'
                  AND a.meta ->> 'providerState' = 'UNPAID'
                  AND a.meta ->> 'shiftId' = ${shift.id}
                  AND a.meta ->> 'organizationId' = ${shift.organizationId}
                  AND a.meta ->> 'invoiceId' = "QPayInvoice".id
              )))
            AND "webhookPayload" #>> '{checkout,shiftId}' = ${shift.id})
           OR ("status" = 'PAID'
               AND "webhookPayload" #>> '{checkout,shiftId}' IS NULL
               AND ("createdAt" AT TIME ZONE 'UTC') >= ${shift.openedAt}
               AND "initiatedById" = ${shift.cashierId})
         )) AS "qrCount"
  `;
  return {
    cardCount: Number(result?.cardCount ?? 0),
    qrCount: Number(result?.qrCount ?? 0),
  };
}
