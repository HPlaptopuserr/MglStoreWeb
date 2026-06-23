-- CreateEnum
CREATE TYPE "PosLoyaltyRedemptionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CONSUMED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PosLoyaltyRedemptionSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "registerId" TEXT,
    "cashierId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "requestedPoints" INTEGER NOT NULL,
    "saleTotal" DECIMAL(18,2) NOT NULL,
    "status" "PosLoyaltyRedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "saleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosLoyaltyRedemptionSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PosLoyaltyRedemptionSession_token_key" ON "PosLoyaltyRedemptionSession"("token");

-- CreateIndex
CREATE INDEX "PosLoyaltyRedemptionSession_organizationId_createdAt_idx" ON "PosLoyaltyRedemptionSession"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "PosLoyaltyRedemptionSession_branchId_createdAt_idx" ON "PosLoyaltyRedemptionSession"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "PosLoyaltyRedemptionSession_registerId_createdAt_idx" ON "PosLoyaltyRedemptionSession"("registerId", "createdAt");

-- CreateIndex
CREATE INDEX "PosLoyaltyRedemptionSession_cashierId_createdAt_idx" ON "PosLoyaltyRedemptionSession"("cashierId", "createdAt");

-- CreateIndex
CREATE INDEX "PosLoyaltyRedemptionSession_userId_createdAt_idx" ON "PosLoyaltyRedemptionSession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PosLoyaltyRedemptionSession_status_expiresAt_idx" ON "PosLoyaltyRedemptionSession"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "PosLoyaltyRedemptionSession_saleId_idx" ON "PosLoyaltyRedemptionSession"("saleId");
