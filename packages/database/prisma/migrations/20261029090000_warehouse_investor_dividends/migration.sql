ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WAREHOUSE_DIVIDEND_UPDATED';
CREATE TABLE "WarehouseInvestorDividend" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "month" VARCHAR(7) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WarehouseInvestorDividend_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WarehouseInvestorDividend_month_check" CHECK ("month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT "WarehouseInvestorDividend_amount_check" CHECK ("amount" >= 0 AND "amount" <= 999999999999.99),
  CONSTRAINT "WarehouseInvestorDividend_version_check" CHECK ("version" >= 1),
  CONSTRAINT "WarehouseInvestorDividend_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WarehouseInvestorDividend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WarehouseInvestorDividend_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WarehouseInvestorDividend_warehouseId_userId_month_key" ON "WarehouseInvestorDividend"("warehouseId", "userId", "month");
CREATE INDEX "WarehouseInvestorDividend_warehouseId_month_idx" ON "WarehouseInvestorDividend"("warehouseId", "month");
CREATE INDEX "WarehouseInvestorDividend_userId_month_idx" ON "WarehouseInvestorDividend"("userId", "month");

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WAREHOUSE_DIVIDEND_CONFIRMED';
CREATE TYPE "WarehouseDividendChoice" AS ENUM ('BANK_TRANSFER', 'REINVEST');
CREATE TABLE "WarehouseDividendDecision" (
  "id" TEXT NOT NULL,
  "dividendId" TEXT NOT NULL,
  "choice" "WarehouseDividendChoice" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "dividendVersion" INTEGER NOT NULL,
  "phone" TEXT NOT NULL,
  "providerSessionId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "bankName" TEXT,
  "bankAccount" TEXT,
  "bankAccountName" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WarehouseDividendDecision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WarehouseDividendDecision_amount_check" CHECK ("amount" > 0 AND "amount" <= 999999999999.99),
  CONSTRAINT "WarehouseDividendDecision_bank_check" CHECK ("choice" <> 'BANK_TRANSFER' OR ("bankName" IS NOT NULL AND "bankAccount" IS NOT NULL AND "bankAccountName" IS NOT NULL)),
  CONSTRAINT "WarehouseDividendDecision_dividendId_fkey" FOREIGN KEY ("dividendId") REFERENCES "WarehouseInvestorDividend"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WarehouseDividendDecision_dividendId_key" ON "WarehouseDividendDecision"("dividendId");
CREATE UNIQUE INDEX "WarehouseDividendDecision_providerSessionId_key" ON "WarehouseDividendDecision"("providerSessionId");
