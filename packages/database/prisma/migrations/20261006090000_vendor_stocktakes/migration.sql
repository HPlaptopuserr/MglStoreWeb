-- CreateEnum
CREATE TYPE "StocktakeStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StocktakeKind" AS ENUM ('FULL', 'PARTIAL');

-- CreateTable
CREATE TABLE "Stocktake" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "title" TEXT NOT NULL,
    "kind" "StocktakeKind" NOT NULL,
    "status" "StocktakeStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stocktake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StocktakeLine" (
    "id" TEXT NOT NULL,
    "stocktakeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "barcode" TEXT,
    "barcodeAliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "unit" TEXT,
    "expected" INTEGER NOT NULL,
    "counted" INTEGER,
    "stockUpdatedAt" TIMESTAMP(3) NOT NULL,
    "countedAt" TIMESTAMP(3),
    "countedById" TEXT,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "StocktakeLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Stocktake_organizationId_createdAt_idx" ON "Stocktake"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StocktakeLine_stocktakeId_productId_key" ON "StocktakeLine"("stocktakeId", "productId");

-- AddForeignKey
ALTER TABLE "Stocktake" ADD CONSTRAINT "Stocktake_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stocktake" ADD CONSTRAINT "Stocktake_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stocktake" ADD CONSTRAINT "Stocktake_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stocktake" ADD CONSTRAINT "Stocktake_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeLine" ADD CONSTRAINT "StocktakeLine_stocktakeId_fkey" FOREIGN KEY ("stocktakeId") REFERENCES "Stocktake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeLine" ADD CONSTRAINT "StocktakeLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A NULL warehouse denotes direct organization stock. Separate partial indexes
-- enforce one open session per scope even when requests race.
CREATE UNIQUE INDEX "Stocktake_active_direct_key" ON "Stocktake" ("organizationId")
WHERE "warehouseId" IS NULL AND "status" IN ('DRAFT', 'REVIEW');
CREATE UNIQUE INDEX "Stocktake_active_warehouse_key" ON "Stocktake" ("organizationId", "warehouseId")
WHERE "warehouseId" IS NOT NULL AND "status" IN ('DRAFT', 'REVIEW');
ALTER TABLE "StocktakeLine" ADD CONSTRAINT "StocktakeLine_counted_nonnegative" CHECK ("counted" IS NULL OR "counted" >= 0);
