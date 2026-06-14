-- Add POS sales as an M Point source and keep a unified loyalty register per POS receipt.
ALTER TYPE "PaidAccessSourceType" ADD VALUE IF NOT EXISTS 'POS_SALE';

CREATE TABLE "PosLoyaltyTransaction" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "userId" TEXT,
  "customerPhone" TEXT NOT NULL,
  "action" "MPointLedgerType" NOT NULL,
  "baseRate" DECIMAL(5,4) NOT NULL,
  "effectiveRate" DECIMAL(5,4) NOT NULL,
  "saleTotal" DECIMAL(18,2) NOT NULL,
  "earnedPoints" INTEGER NOT NULL DEFAULT 0,
  "redeemedPoints" INTEGER NOT NULL DEFAULT 0,
  "membershipBadge" TEXT,
  "note" TEXT,
  "ledgerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PosLoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PosLoyaltyTransaction_saleId_key" ON "PosLoyaltyTransaction"("saleId");
CREATE UNIQUE INDEX "PosLoyaltyTransaction_ledgerId_key" ON "PosLoyaltyTransaction"("ledgerId");
CREATE INDEX "PosLoyaltyTransaction_organizationId_createdAt_idx" ON "PosLoyaltyTransaction"("organizationId", "createdAt");
CREATE INDEX "PosLoyaltyTransaction_branchId_createdAt_idx" ON "PosLoyaltyTransaction"("branchId", "createdAt");
CREATE INDEX "PosLoyaltyTransaction_userId_createdAt_idx" ON "PosLoyaltyTransaction"("userId", "createdAt");
CREATE INDEX "PosLoyaltyTransaction_action_createdAt_idx" ON "PosLoyaltyTransaction"("action", "createdAt");

ALTER TABLE "PosLoyaltyTransaction"
  ADD CONSTRAINT "PosLoyaltyTransaction_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "PosSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PosLoyaltyTransaction"
  ADD CONSTRAINT "PosLoyaltyTransaction_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosLoyaltyTransaction"
  ADD CONSTRAINT "PosLoyaltyTransaction_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosLoyaltyTransaction"
  ADD CONSTRAINT "PosLoyaltyTransaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PosLoyaltyTransaction"
  ADD CONSTRAINT "PosLoyaltyTransaction_ledgerId_fkey"
  FOREIGN KEY ("ledgerId") REFERENCES "MPointLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;
