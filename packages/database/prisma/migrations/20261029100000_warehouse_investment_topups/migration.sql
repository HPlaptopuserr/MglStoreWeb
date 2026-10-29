CREATE TABLE "WarehouseInvestmentTopUp" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL CHECK ("amount" > 0),
  "method" TEXT NOT NULL CHECK ("method" IN ('QR', 'BANK_TRANSFER')),
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'PAID')),
  "accountId" TEXT NOT NULL,
  "merchantCode" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "accountHolder" TEXT NOT NULL,
  "invoiceId" TEXT,
  "qrText" TEXT,
  "paidAt" TIMESTAMP(3),
  "confirmedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WarehouseInvestmentTopUp_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WarehouseInvestmentTopUp_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WarehouseInvestmentTopUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WarehouseInvestmentTopUp_requestId_key" ON "WarehouseInvestmentTopUp"("requestId");
CREATE UNIQUE INDEX "WarehouseInvestmentTopUp_invoiceId_key" ON "WarehouseInvestmentTopUp"("invoiceId");
CREATE INDEX "WarehouseInvestmentTopUp_warehouseId_userId_createdAt_idx" ON "WarehouseInvestmentTopUp"("warehouseId", "userId", "createdAt");
CREATE INDEX "WarehouseInvestmentTopUp_warehouseId_status_method_idx" ON "WarehouseInvestmentTopUp"("warehouseId", "status", "method");
