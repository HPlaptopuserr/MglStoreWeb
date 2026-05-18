DO $$
BEGIN
  CREATE TYPE "ProductSupplyType" AS ENUM ('IN_STOCK', 'CHINA_PREORDER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "supplyType" "ProductSupplyType" NOT NULL DEFAULT 'IN_STOCK',
  ADD COLUMN IF NOT EXISTS "preorderLeadTimeDays" INTEGER,
  ADD COLUMN IF NOT EXISTS "preorderNote" TEXT;

CREATE INDEX IF NOT EXISTS "Product_supplyType_idx" ON "Product"("supplyType");
