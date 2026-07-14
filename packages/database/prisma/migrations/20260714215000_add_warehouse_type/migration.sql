CREATE TYPE "WarehouseType" AS ENUM ('CENTRAL', 'VENDOR_INTERNAL');

ALTER TABLE "Warehouse"
  ADD COLUMN "type" "WarehouseType" NOT NULL DEFAULT 'CENTRAL';

-- These warehouses were created automatically by vendor product inventory.
-- They remain valid inventory containers but are no longer exposed as centrally
-- operated warehouses.
UPDATE "Warehouse"
SET "type" = 'VENDOR_INTERNAL'
WHERE "name" LIKE '% - Үндсэн агуулах';

CREATE INDEX "Warehouse_type_idx" ON "Warehouse"("type");
