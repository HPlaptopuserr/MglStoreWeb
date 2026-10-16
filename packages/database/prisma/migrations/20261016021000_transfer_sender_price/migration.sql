-- Pending documents created before sender-price snapshots use the sender's current selling price.
-- Received documents retain their existing valuation.
UPDATE "WarehouseTransferItem" AS item SET "unitCost" = product."price"
FROM "Product" AS product, "WarehouseTransfer" AS transfer
WHERE product."id" = item."sourceProductId" AND transfer."id" = item."transferId" AND transfer."status" = 'SENT';
