-- A product can belong directly to a warehouse without an assigned organization.
ALTER TABLE "Product" ALTER COLUMN "organizationId" DROP NOT NULL;

-- PostgreSQL's organization/SKU unique key does not cover NULL organization IDs.
-- Keep warehouse-owned SKU uniqueness under concurrent creation and import.
CREATE UNIQUE INDEX "Product_warehouse_owned_sku_key"
ON "Product" ("managedByWarehouseId", "sku")
WHERE "organizationId" IS NULL;
