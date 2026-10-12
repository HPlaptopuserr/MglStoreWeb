-- Self-service kiosk tickets do not have a restaurant table to release.
-- Older sales left these tickets in PAID, which permanently blocked shift close.
UPDATE "RestaurantTicket"
SET
  "status" = 'CLOSED',
  "closedAt" = COALESCE("closedAt", CURRENT_TIMESTAMP),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  "tableId" IS NULL
  AND "posSaleId" IS NOT NULL
  AND "status" = 'PAID';
