CREATE TABLE "PosGoodsReceipt" (
    "id" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierRegisterNo" TEXT,
    "documentNo" TEXT,
    "note" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosGoodsReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosGoodsReceiptItem" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "remainingQuantity" INTEGER NOT NULL,
    "batchNumber" TEXT,
    "expiryDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosGoodsReceiptItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosGoodsReceiptAllocation" (
    "id" TEXT NOT NULL,
    "receiptItemId" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),

    CONSTRAINT "PosGoodsReceiptAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PosGoodsReceipt_receiptNo_key" ON "PosGoodsReceipt"("receiptNo");
CREATE INDEX "PosGoodsReceipt_organizationId_receivedAt_idx" ON "PosGoodsReceipt"("organizationId", "receivedAt");
CREATE INDEX "PosGoodsReceipt_branchId_receivedAt_idx" ON "PosGoodsReceipt"("branchId", "receivedAt");
CREATE INDEX "PosGoodsReceipt_registerId_receivedAt_idx" ON "PosGoodsReceipt"("registerId", "receivedAt");
CREATE INDEX "PosGoodsReceipt_receivedById_receivedAt_idx" ON "PosGoodsReceipt"("receivedById", "receivedAt");

CREATE INDEX "PosGoodsReceiptItem_receiptId_idx" ON "PosGoodsReceiptItem"("receiptId");
CREATE INDEX "PosGoodsReceiptItem_productId_expiryDate_idx" ON "PosGoodsReceiptItem"("productId", "expiryDate");
CREATE INDEX "PosGoodsReceiptItem_productId_remainingQuantity_expiryDate_idx" ON "PosGoodsReceiptItem"("productId", "remainingQuantity", "expiryDate");
CREATE INDEX "PosGoodsReceiptItem_batchNumber_idx" ON "PosGoodsReceiptItem"("batchNumber");

CREATE INDEX "PosGoodsReceiptAllocation_receiptItemId_idx" ON "PosGoodsReceiptAllocation"("receiptItemId");
CREATE INDEX "PosGoodsReceiptAllocation_referenceType_referenceId_idx" ON "PosGoodsReceiptAllocation"("referenceType", "referenceId");
CREATE INDEX "PosGoodsReceiptAllocation_referenceType_referenceId_reversedAt_idx" ON "PosGoodsReceiptAllocation"("referenceType", "referenceId", "reversedAt");

ALTER TABLE "PosGoodsReceipt"
ADD CONSTRAINT "PosGoodsReceipt_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosGoodsReceipt"
ADD CONSTRAINT "PosGoodsReceipt_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosGoodsReceipt"
ADD CONSTRAINT "PosGoodsReceipt_registerId_fkey"
FOREIGN KEY ("registerId") REFERENCES "PosRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosGoodsReceipt"
ADD CONSTRAINT "PosGoodsReceipt_receivedById_fkey"
FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosGoodsReceiptItem"
ADD CONSTRAINT "PosGoodsReceiptItem_receiptId_fkey"
FOREIGN KEY ("receiptId") REFERENCES "PosGoodsReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PosGoodsReceiptItem"
ADD CONSTRAINT "PosGoodsReceiptItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosGoodsReceiptAllocation"
ADD CONSTRAINT "PosGoodsReceiptAllocation_receiptItemId_fkey"
FOREIGN KEY ("receiptItemId") REFERENCES "PosGoodsReceiptItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
