-- Deactivate the legacy unpaid stock-request invoice requested by operations.
-- Keep the record for audit/history instead of deleting financial data.
UPDATE "StockRequestPayment"
SET
  "status" = 'CANCELLED',
  "note" = CASE
    WHEN "note" IS NULL OR BTRIM("note") = ''
      THEN 'Operations cancelled legacy invoice INV-2605280006.'
    WHEN "note" NOT LIKE '%Operations cancelled legacy invoice INV-2605280006.%'
      THEN "note" || E'\nOperations cancelled legacy invoice INV-2605280006.'
    ELSE "note"
  END,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  "invoiceNumber" = 'INV-2605280006'
  AND "totalAmount" = 477788.00
  AND "paidAmount" = 0
  AND "status" IN ('PENDING', 'FAILED');
