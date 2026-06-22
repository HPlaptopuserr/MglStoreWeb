ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CREDIT';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PosCreditStatus') THEN
    CREATE TYPE "PosCreditStatus" AS ENUM ('OPEN', 'PAID', 'OVERDUE', 'CANCELLED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PosCreditSale" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "registerId" TEXT,
  "shiftId" TEXT NOT NULL,
  "cashierId" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "customerEmail" TEXT,
  "customerAddress" TEXT,
  "principalAmount" DECIMAL(18,2) NOT NULL,
  "monthlyInterestRate" DECIMAL(5,2) NOT NULL DEFAULT 1.2,
  "monthlyInterestAmount" DECIMAL(18,2) NOT NULL,
  "totalDueAfterFirstMonth" DECIMAL(18,2) NOT NULL,
  "status" "PosCreditStatus" NOT NULL DEFAULT 'OPEN',
  "dueDate" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PosCreditSale_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PosCreditSale_saleId_key" ON "PosCreditSale"("saleId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_organizationId_idx" ON "PosCreditSale"("organizationId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_branchId_idx" ON "PosCreditSale"("branchId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_registerId_idx" ON "PosCreditSale"("registerId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_shiftId_idx" ON "PosCreditSale"("shiftId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_cashierId_idx" ON "PosCreditSale"("cashierId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_customerPhone_idx" ON "PosCreditSale"("customerPhone");
CREATE INDEX IF NOT EXISTS "PosCreditSale_status_idx" ON "PosCreditSale"("status");
CREATE INDEX IF NOT EXISTS "PosCreditSale_dueDate_idx" ON "PosCreditSale"("dueDate");
CREATE INDEX IF NOT EXISTS "PosCreditSale_createdAt_idx" ON "PosCreditSale"("createdAt");

ALTER TABLE "PosCreditSale"
  ADD CONSTRAINT "PosCreditSale_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "PosSale"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PosCreditSale_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PosCreditSale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PosCreditSale_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "PosRegister"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PosCreditSale_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "PosShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PosCreditSale_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
