ALTER TABLE "PosSale"
  ADD COLUMN "ebarimtReturnStatus" TEXT,
  ADD COLUMN "ebarimtReturnError" TEXT,
  ADD COLUMN "ebarimtReturnPayload" JSONB,
  ADD COLUMN "ebarimtReturnSyncedAt" TIMESTAMP(3),
  ADD COLUMN "returnedTotal" DECIMAL(18, 2) NOT NULL DEFAULT 0;

ALTER TABLE "PosSaleLine"
  ADD COLUMN "returnedQty" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "PosSaleReturn" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "registerId" TEXT,
  "shiftId" TEXT NOT NULL,
  "cashierId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "totalAmount" DECIMAL(18, 2) NOT NULL,
  "ebarimtStatus" TEXT,
  "ebarimtError" TEXT,
  "ebarimtPayload" JSONB,
  "ebarimtSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PosSaleReturn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosSaleReturnLine" (
  "id" TEXT NOT NULL,
  "returnId" TEXT NOT NULL,
  "saleLineId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "unitPrice" DECIMAL(18, 2) NOT NULL,
  "lineTotal" DECIMAL(18, 2) NOT NULL,

  CONSTRAINT "PosSaleReturnLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PosSaleReturn_saleId_idx" ON "PosSaleReturn"("saleId");
CREATE INDEX "PosSaleReturn_organizationId_idx" ON "PosSaleReturn"("organizationId");
CREATE INDEX "PosSaleReturn_branchId_idx" ON "PosSaleReturn"("branchId");
CREATE INDEX "PosSaleReturn_shiftId_idx" ON "PosSaleReturn"("shiftId");
CREATE INDEX "PosSaleReturn_cashierId_idx" ON "PosSaleReturn"("cashierId");
CREATE INDEX "PosSaleReturn_createdAt_idx" ON "PosSaleReturn"("createdAt");

CREATE INDEX "PosSaleReturnLine_returnId_idx" ON "PosSaleReturnLine"("returnId");
CREATE INDEX "PosSaleReturnLine_saleLineId_idx" ON "PosSaleReturnLine"("saleLineId");
CREATE INDEX "PosSaleReturnLine_productId_idx" ON "PosSaleReturnLine"("productId");

ALTER TABLE "PosSaleReturn"
  ADD CONSTRAINT "PosSaleReturn_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "PosSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PosSaleReturnLine"
  ADD CONSTRAINT "PosSaleReturnLine_returnId_fkey"
  FOREIGN KEY ("returnId") REFERENCES "PosSaleReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PosSaleReturnLine"
  ADD CONSTRAINT "PosSaleReturnLine_saleLineId_fkey"
  FOREIGN KEY ("saleLineId") REFERENCES "PosSaleLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
