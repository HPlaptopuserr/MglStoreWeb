ALTER TABLE "Product" ADD COLUMN "managedByWarehouseId" TEXT;

CREATE INDEX "Product_managedByWarehouseId_idx"
  ON "Product"("managedByWarehouseId");

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_managedByWarehouseId_fkey"
  FOREIGN KEY ("managedByWarehouseId") REFERENCES "Warehouse"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing products held by a centrally operated warehouse are treated as
-- warehouse-managed. Vendor internal inventory is intentionally excluded.
UPDATE "Product" p
SET "managedByWarehouseId" = ownership."warehouseId"
FROM (
  SELECT DISTINCT ON (wi."productId")
    wi."productId",
    wi."warehouseId"
  FROM "WarehouseInventory" wi
  JOIN "Warehouse" w ON w."id" = wi."warehouseId"
  WHERE w."type" = 'CENTRAL' AND w."deletedAt" IS NULL
  ORDER BY wi."productId", wi."createdAt"
) ownership
WHERE p."id" = ownership."productId";
