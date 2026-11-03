-- CreateEnum
CREATE TYPE "WarehouseTransferStatus" AS ENUM ('SENT', 'RECEIVED');

-- CreateTable
CREATE TABLE "WarehouseTransfer" (
    "id" TEXT NOT NULL,
    "sourceWarehouseId" TEXT NOT NULL,
    "destinationWarehouseId" TEXT NOT NULL,
    "status" "WarehouseTransferStatus" NOT NULL DEFAULT 'SENT',
    "note" TEXT,
    "sentById" TEXT NOT NULL,
    "receivedById" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),

    CONSTRAINT "WarehouseTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseTransferItem" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "sourceProductId" TEXT NOT NULL,
    "targetProductId" TEXT,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "quantity" INTEGER NOT NULL,
    "salePrice" DECIMAL(18,2),

    CONSTRAINT "WarehouseTransferItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WarehouseTransfer_destinationWarehouseId_status_sentAt_idx" ON "WarehouseTransfer"("destinationWarehouseId", "status", "sentAt");

-- CreateIndex
CREATE INDEX "WarehouseTransfer_sourceWarehouseId_sentAt_idx" ON "WarehouseTransfer"("sourceWarehouseId", "sentAt");

-- CreateIndex
CREATE INDEX "WarehouseTransferItem_sourceProductId_idx" ON "WarehouseTransferItem"("sourceProductId");

-- CreateIndex
CREATE INDEX "WarehouseTransferItem_targetProductId_idx" ON "WarehouseTransferItem"("targetProductId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseTransferItem_transferId_sourceProductId_key" ON "WarehouseTransferItem"("transferId", "sourceProductId");

-- AddForeignKey
ALTER TABLE "WarehouseTransfer" ADD CONSTRAINT "WarehouseTransfer_sourceWarehouseId_fkey" FOREIGN KEY ("sourceWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseTransfer" ADD CONSTRAINT "WarehouseTransfer_destinationWarehouseId_fkey" FOREIGN KEY ("destinationWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseTransferItem" ADD CONSTRAINT "WarehouseTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "WarehouseTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseTransferItem" ADD CONSTRAINT "WarehouseTransferItem_sourceProductId_fkey" FOREIGN KEY ("sourceProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseTransferItem" ADD CONSTRAINT "WarehouseTransferItem_targetProductId_fkey" FOREIGN KEY ("targetProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

