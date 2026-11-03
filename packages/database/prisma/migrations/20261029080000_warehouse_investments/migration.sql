ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WAREHOUSE_INVESTMENT_UPDATED';
CREATE TABLE "WarehouseInvestment" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WarehouseInvestment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WarehouseInvestment_amount_check" CHECK ("amount" >= 0 AND "amount" <= 999999999999.99),
  CONSTRAINT "WarehouseInvestment_version_check" CHECK ("version" >= 1),
  CONSTRAINT "WarehouseInvestment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WarehouseInvestment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WarehouseInvestment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WarehouseInvestment_warehouseId_userId_key" ON "WarehouseInvestment"("warehouseId", "userId");
CREATE INDEX "WarehouseInvestment_userId_idx" ON "WarehouseInvestment"("userId");
