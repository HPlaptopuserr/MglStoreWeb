-- Support public visibility toggles for central warehouse catalog inventory.
ALTER TABLE "WarehouseInventory"
  ADD COLUMN IF NOT EXISTS "showOnWeb" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "WarehouseInventory_showOnWeb_idx"
  ON "WarehouseInventory"("showOnWeb");
