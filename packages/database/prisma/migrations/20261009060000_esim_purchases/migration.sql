CREATE TABLE "EsimPurchase" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL,
  "memberPrice" BOOLEAN NOT NULL DEFAULT false, "quoteHash" TEXT NOT NULL, "offerId" TEXT NOT NULL, "packageId" TEXT NOT NULL,
  "merchantCode" TEXT NOT NULL, "title" TEXT NOT NULL, "country" TEXT NOT NULL, "dataMb" DOUBLE PRECISION NOT NULL,
  "days" INTEGER NOT NULL, "totalMnt" INTEGER NOT NULL, "wholesaleUsdUnits" INTEGER NOT NULL,
  "terms" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'CREATING_INVOICE',
  "invoiceId" TEXT, "invoice" JSONB, "paymentId" TEXT, "supplierOrderNo" TEXT,
  "activationEncrypted" TEXT, "supplierStatus" TEXT, "errorCode" TEXT,
  "leaseToken" TEXT, "leaseUntil" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3), "fulfilledAt" TIMESTAMP(3),
  CONSTRAINT "EsimPurchase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EsimPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EsimPurchase_positive_amounts" CHECK ("totalMnt" > 0 AND "wholesaleUsdUnits" > 0 AND "days" > 0 AND "dataMb" > 0),
  CONSTRAINT "EsimPurchase_valid_status" CHECK ("status" IN ('CREATING_INVOICE','AWAITING_PAYMENT','PAYMENT_REVIEW','PAID','PROVISIONING','READY','FULFILLMENT_REVIEW','REFUNDED'))
);
CREATE UNIQUE INDEX "EsimPurchase_userId_idempotencyKey_key" ON "EsimPurchase"("userId", "idempotencyKey");
CREATE UNIQUE INDEX "EsimPurchase_quoteHash_key" ON "EsimPurchase"("quoteHash");
CREATE UNIQUE INDEX "EsimPurchase_invoiceId_key" ON "EsimPurchase"("invoiceId");
CREATE UNIQUE INDEX "EsimPurchase_paymentId_key" ON "EsimPurchase"("paymentId");
CREATE UNIQUE INDEX "EsimPurchase_supplierOrderNo_key" ON "EsimPurchase"("supplierOrderNo");
CREATE INDEX "EsimPurchase_status_nextAttemptAt_idx" ON "EsimPurchase"("status", "nextAttemptAt");
CREATE INDEX "EsimPurchase_userId_createdAt_idx" ON "EsimPurchase"("userId", "createdAt");
