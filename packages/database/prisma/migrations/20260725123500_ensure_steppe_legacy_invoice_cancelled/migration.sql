-- Company-scoped safeguard for the legacy stock invoice cancellation.
-- This migration is intentionally idempotent and never changes a paid invoice.
UPDATE "StockRequestPayment" AS payment
SET
  "status" = 'CANCELLED',
  "note" = CASE
    WHEN payment."note" IS NULL OR BTRIM(payment."note") = ''
      THEN 'Operations cancelled legacy invoice INV-2605280006 for ЭМ ЖИ ЭЛ БМБЧ степпе ХХК.'
    WHEN payment."note" NOT LIKE '%Operations cancelled legacy invoice INV-2605280006 for ЭМ ЖИ ЭЛ БМБЧ степпе ХХК.%'
      THEN payment."note" || E'\nOperations cancelled legacy invoice INV-2605280006 for ЭМ ЖИ ЭЛ БМБЧ степпе ХХК.'
    ELSE payment."note"
  END,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  payment."invoiceNumber" = 'INV-2605280006'
  AND payment."totalAmount" = 477788.00
  AND payment."paidAmount" = 0
  AND payment."status" IN ('PENDING', 'FAILED', 'CANCELLED')
  AND EXISTS (
    SELECT 1
    FROM "Organization" AS organization
    WHERE
      organization."id" = payment."organizationId"
      AND LOWER(BTRIM(organization."name")) = LOWER('ЭМ ЖИ ЭЛ БМБЧ степпе ХХК')
  );
