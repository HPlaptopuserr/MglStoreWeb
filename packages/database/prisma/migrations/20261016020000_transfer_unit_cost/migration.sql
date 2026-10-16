ALTER TABLE "WarehouseTransferItem" ADD COLUMN "unitCost" DECIMAL(18,2);
-- Existing transfer documents predate cost snapshots; initialize from current source cost.
UPDATE "WarehouseTransferItem" AS item SET "unitCost" = COALESCE(product."costPrice", product."price")
FROM "Product" AS product WHERE product."id" = item."sourceProductId";
