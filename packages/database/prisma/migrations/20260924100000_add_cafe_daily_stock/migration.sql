CREATE TABLE "CafeDailyStock" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "openingQty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "wasteQty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CafeDailyStock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CafeDailyStock_branchId_productId_businessDate_key"
ON "CafeDailyStock"("branchId", "productId", "businessDate");

CREATE INDEX "CafeDailyStock_organizationId_businessDate_idx"
ON "CafeDailyStock"("organizationId", "businessDate");

CREATE INDEX "CafeDailyStock_branchId_businessDate_idx"
ON "CafeDailyStock"("branchId", "businessDate");

CREATE INDEX "CafeDailyStock_productId_businessDate_idx"
ON "CafeDailyStock"("productId", "businessDate");

ALTER TABLE "CafeDailyStock"
ADD CONSTRAINT "CafeDailyStock_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CafeDailyStock"
ADD CONSTRAINT "CafeDailyStock_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CafeDailyStock"
ADD CONSTRAINT "CafeDailyStock_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CafeDailyStock"
ADD CONSTRAINT "CafeDailyStock_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CafeDailyStock"
ADD CONSTRAINT "CafeDailyStock_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CafeDailyStockReceipt" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "note" TEXT,
    "receivedById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CafeDailyStockReceipt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CafeDailyStockReceipt_organizationId_businessDate_idx"
ON "CafeDailyStockReceipt"("organizationId", "businessDate");

CREATE INDEX "CafeDailyStockReceipt_branchId_businessDate_voidedAt_idx"
ON "CafeDailyStockReceipt"("branchId", "businessDate", "voidedAt");

CREATE INDEX "CafeDailyStockReceipt_productId_businessDate_voidedAt_idx"
ON "CafeDailyStockReceipt"("productId", "businessDate", "voidedAt");

CREATE INDEX "CafeDailyStockReceipt_batchId_idx"
ON "CafeDailyStockReceipt"("batchId");

ALTER TABLE "CafeDailyStockReceipt"
ADD CONSTRAINT "CafeDailyStockReceipt_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CafeDailyStockReceipt"
ADD CONSTRAINT "CafeDailyStockReceipt_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CafeDailyStockReceipt"
ADD CONSTRAINT "CafeDailyStockReceipt_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CafeDailyStockReceipt"
ADD CONSTRAINT "CafeDailyStockReceipt_receivedById_fkey"
FOREIGN KEY ("receivedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CafeDailyStockReceipt"
ADD CONSTRAINT "CafeDailyStockReceipt_voidedById_fkey"
FOREIGN KEY ("voidedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
