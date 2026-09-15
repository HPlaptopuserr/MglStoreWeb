ALTER TABLE "InventoryLedger"
ADD COLUMN "warehouseId" TEXT;

ALTER TABLE "InventoryLedger"
ADD CONSTRAINT "InventoryLedger_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "InventoryLedger_warehouseId_createdAt_idx"
ON "InventoryLedger"("warehouseId", "createdAt");
