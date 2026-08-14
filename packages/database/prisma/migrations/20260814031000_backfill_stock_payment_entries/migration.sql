-- Backfill legacy confirmed payments so the finance ledger is complete from
-- the first day the detailed history UI is enabled.
INSERT INTO "StockRequestPaymentEntry" (
    "id",
    "paymentId",
    "amount",
    "method",
    "status",
    "transactionId",
    "confirmedById",
    "confirmedAt",
    "note",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    payment."id",
    payment."paidAmount",
    COALESCE(payment."paymentMethod", 'BANK_TRANSFER'::"PaymentMethod"),
    'PAID'::"PaymentStatus",
    'HISTORICAL-' || payment."id",
    payment."confirmedById",
    COALESCE(payment."confirmedAt", payment."paidAt", payment."updatedAt"),
    COALESCE(payment."note", 'Өмнөх төлбөрөөс шилжүүлсэн бүртгэл'),
    COALESCE(payment."paidAt", payment."updatedAt"),
    payment."updatedAt"
FROM "StockRequestPayment" payment
WHERE payment."paidAmount" > 0
  AND NOT EXISTS (
    SELECT 1
    FROM "StockRequestPaymentEntry" entry
    WHERE entry."paymentId" = payment."id"
  );
