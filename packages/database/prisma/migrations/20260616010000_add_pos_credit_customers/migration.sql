DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PosCreditStatus') THEN
    CREATE TYPE "PosCreditStatus" AS ENUM ('OPEN', 'PAID', 'OVERDUE', 'CANCELLED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PosCreditCustomer" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "borrowerName" TEXT NOT NULL,
  "borrowerPhone" TEXT,
  "employeeId" TEXT,
  "employeeName" TEXT,
  "normalizedBorrowerKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PosCreditCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PosCreditSale" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "customerId" TEXT,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "registerId" TEXT,
  "shiftId" TEXT NOT NULL,
  "cashierId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "borrowerName" TEXT NOT NULL,
  "borrowerPhone" TEXT,
  "employeeId" TEXT,
  "employeeName" TEXT,
  "principalAmount" DECIMAL(18,2) NOT NULL,
  "monthlyInterestRate" DECIMAL(7,4) NOT NULL DEFAULT 0.012,
  "totalInterest" DECIMAL(18,2) NOT NULL,
  "totalDue" DECIMAL(18,2) NOT NULL,
  "termMonths" INTEGER NOT NULL DEFAULT 1,
  "status" "PosCreditStatus" NOT NULL DEFAULT 'OPEN',
  "paidAmount" DECIMAL(18,2),
  "paymentMethod" "PaymentMethod",
  "paymentNote" TEXT,
  "dueDate" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PosCreditSale_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PosCreditCustomer_organizationId_normalizedBorrowerKey_key"
  ON "PosCreditCustomer"("organizationId", "normalizedBorrowerKey");
CREATE INDEX IF NOT EXISTS "PosCreditCustomer_organizationId_idx"
  ON "PosCreditCustomer"("organizationId");
CREATE INDEX IF NOT EXISTS "PosCreditCustomer_borrowerName_idx"
  ON "PosCreditCustomer"("borrowerName");
CREATE INDEX IF NOT EXISTS "PosCreditCustomer_borrowerId_idx"
  ON "PosCreditCustomer"("borrowerId");

CREATE UNIQUE INDEX IF NOT EXISTS "PosCreditSale_saleId_key"
  ON "PosCreditSale"("saleId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_organizationId_idx"
  ON "PosCreditSale"("organizationId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_customerId_idx"
  ON "PosCreditSale"("customerId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_branchId_idx"
  ON "PosCreditSale"("branchId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_registerId_idx"
  ON "PosCreditSale"("registerId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_shiftId_idx"
  ON "PosCreditSale"("shiftId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_cashierId_idx"
  ON "PosCreditSale"("cashierId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_borrowerId_idx"
  ON "PosCreditSale"("borrowerId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_status_idx"
  ON "PosCreditSale"("status");
CREATE INDEX IF NOT EXISTS "PosCreditSale_dueDate_idx"
  ON "PosCreditSale"("dueDate");
CREATE INDEX IF NOT EXISTS "PosCreditSale_createdAt_idx"
  ON "PosCreditSale"("createdAt");

ALTER TABLE "PosCreditCustomer"
  ADD CONSTRAINT "PosCreditCustomer_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosCreditSale"
  ADD CONSTRAINT "PosCreditSale_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "PosSale"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PosCreditSale_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "PosCreditCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PosCreditSale_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PosCreditSale_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PosCreditSale_registerId_fkey"
  FOREIGN KEY ("registerId") REFERENCES "PosRegister"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PosCreditSale_shiftId_fkey"
  FOREIGN KEY ("shiftId") REFERENCES "PosShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PosCreditSale_cashierId_fkey"
  FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
