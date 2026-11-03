-- Existing sales retain NULL costs: historical costs cannot be reconstructed safely.
ALTER TABLE "WarehouseRetailOrderItem" ADD COLUMN "costPrice" DECIMAL(18,2);
ALTER TABLE "StockRequestPayment" ADD COLUMN "costAmount" DECIMAL(18,2);
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WAREHOUSE_VIEWER_GRANTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WAREHOUSE_VIEWER_REVOKED';
CREATE TABLE "WarehouseViewer" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "grantedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseViewer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WarehouseViewer_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WarehouseViewer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WarehouseViewer_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WarehouseViewer_warehouseId_userId_key" ON "WarehouseViewer"("warehouseId", "userId");
CREATE INDEX "WarehouseViewer_userId_idx" ON "WarehouseViewer"("userId");
CREATE INDEX "WarehouseRetailOrder_warehouseId_paidAt_idx" ON "WarehouseRetailOrder"("warehouseId", "paidAt");
