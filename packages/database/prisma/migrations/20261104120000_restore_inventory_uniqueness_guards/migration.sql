-- Earlier production migration-history baselines did not create these partial
-- indexes. The release preflight rejects existing duplicate identities before
-- any migration runs. This migration never renames, merges or deletes products.
CREATE UNIQUE INDEX IF NOT EXISTS "Product_warehouse_owned_sku_key"
ON "Product" ("managedByWarehouseId", "sku")
WHERE "organizationId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Stocktake_active_direct_key"
ON "Stocktake" ("organizationId")
WHERE "warehouseId" IS NULL AND "status" IN ('DRAFT', 'REVIEW');

CREATE UNIQUE INDEX IF NOT EXISTS "Stocktake_active_warehouse_key"
ON "Stocktake" ("organizationId", "warehouseId")
WHERE "warehouseId" IS NOT NULL AND "status" IN ('DRAFT', 'REVIEW');
