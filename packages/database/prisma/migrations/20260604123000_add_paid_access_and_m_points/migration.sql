-- CreateEnum
CREATE TYPE "PaidAccessSourceType" AS ENUM ('PROJECT', 'FRANCHISE', 'SERVICE');

-- CreateEnum
CREATE TYPE "MPointLedgerType" AS ENUM ('EARN', 'SPEND', 'ADJUST');

-- CreateTable
CREATE TABLE "PaidAccessPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" "PaidAccessSourceType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "invoiceId" TEXT,
    "metadata" JSONB,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaidAccessPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MPointLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MPointLedgerType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER,
    "sourceType" "PaidAccessSourceType",
    "sourceId" TEXT,
    "invoiceId" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MPointLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaidAccessPurchase_invoiceId_key" ON "PaidAccessPurchase"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "PaidAccessPurchase_userId_sourceType_itemId_key" ON "PaidAccessPurchase"("userId", "sourceType", "itemId");

-- CreateIndex
CREATE INDEX "PaidAccessPurchase_userId_purchasedAt_idx" ON "PaidAccessPurchase"("userId", "purchasedAt");

-- CreateIndex
CREATE INDEX "PaidAccessPurchase_sourceType_itemId_idx" ON "PaidAccessPurchase"("sourceType", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "MPointLedger_invoiceId_key" ON "MPointLedger"("invoiceId");

-- CreateIndex
CREATE INDEX "MPointLedger_userId_createdAt_idx" ON "MPointLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MPointLedger_sourceType_sourceId_idx" ON "MPointLedger"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "PaidAccessPurchase" ADD CONSTRAINT "PaidAccessPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MPointLedger" ADD CONSTRAINT "MPointLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
