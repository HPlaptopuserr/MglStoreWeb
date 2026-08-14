-- Preserve every partial payment independently so mixed cash/QPay settlement
-- remains auditable while the parent payment stores the aggregate balance.
CREATE TABLE "StockRequestPaymentEntry" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StockRequestPaymentEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StockRequestPaymentEntry_transactionId_key" ON "StockRequestPaymentEntry"("transactionId");
CREATE INDEX "StockRequestPaymentEntry_paymentId_status_idx" ON "StockRequestPaymentEntry"("paymentId", "status");
CREATE INDEX "StockRequestPaymentEntry_createdAt_idx" ON "StockRequestPaymentEntry"("createdAt");
ALTER TABLE "StockRequestPaymentEntry" ADD CONSTRAINT "StockRequestPaymentEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "StockRequestPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockRequestPaymentEntry" ADD CONSTRAINT "StockRequestPaymentEntry_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
