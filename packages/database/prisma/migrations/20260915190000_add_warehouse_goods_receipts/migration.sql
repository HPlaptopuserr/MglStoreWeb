CREATE TYPE "WarehouseGoodsReceiptStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

CREATE TABLE "WarehouseGoodsReceipt" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierRegisterNumber" TEXT,
    "supplierDocumentNumber" TEXT,
    "documentDate" DATE,
    "status" "WarehouseGoodsReceiptStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WarehouseGoodsReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WarehouseGoodsReceiptItem" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "batchNumber" TEXT,
    "expiryDate" DATE,
    "location" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WarehouseGoodsReceiptItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WarehouseGoodsReceiptAttachment" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WarehouseGoodsReceiptAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WarehouseGoodsReceipt_receiptNumber_key" ON "WarehouseGoodsReceipt"("receiptNumber");
CREATE UNIQUE INDEX "WarehouseGoodsReceipt_warehouseId_supplierDocumentNumber_key" ON "WarehouseGoodsReceipt"("warehouseId", "supplierDocumentNumber");
CREATE INDEX "WarehouseGoodsReceipt_warehouseId_status_createdAt_idx" ON "WarehouseGoodsReceipt"("warehouseId", "status", "createdAt");
CREATE INDEX "WarehouseGoodsReceipt_supplierName_idx" ON "WarehouseGoodsReceipt"("supplierName");
CREATE INDEX "WarehouseGoodsReceipt_createdById_idx" ON "WarehouseGoodsReceipt"("createdById");
CREATE INDEX "WarehouseGoodsReceipt_confirmedById_idx" ON "WarehouseGoodsReceipt"("confirmedById");
CREATE INDEX "WarehouseGoodsReceiptItem_receiptId_idx" ON "WarehouseGoodsReceiptItem"("receiptId");
CREATE INDEX "WarehouseGoodsReceiptItem_productId_idx" ON "WarehouseGoodsReceiptItem"("productId");
CREATE INDEX "WarehouseGoodsReceiptItem_batchNumber_idx" ON "WarehouseGoodsReceiptItem"("batchNumber");
CREATE INDEX "WarehouseGoodsReceiptItem_expiryDate_idx" ON "WarehouseGoodsReceiptItem"("expiryDate");
CREATE INDEX "WarehouseGoodsReceiptAttachment_receiptId_idx" ON "WarehouseGoodsReceiptAttachment"("receiptId");

ALTER TABLE "WarehouseGoodsReceipt" ADD CONSTRAINT "WarehouseGoodsReceipt_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseGoodsReceipt" ADD CONSTRAINT "WarehouseGoodsReceipt_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseGoodsReceipt" ADD CONSTRAINT "WarehouseGoodsReceipt_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WarehouseGoodsReceiptItem" ADD CONSTRAINT "WarehouseGoodsReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "WarehouseGoodsReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseGoodsReceiptItem" ADD CONSTRAINT "WarehouseGoodsReceiptItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseGoodsReceiptAttachment" ADD CONSTRAINT "WarehouseGoodsReceiptAttachment_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "WarehouseGoodsReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
