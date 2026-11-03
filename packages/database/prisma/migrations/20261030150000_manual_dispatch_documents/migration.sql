ALTER TABLE "WarehouseManualDispatch"
  ADD COLUMN "requestId" TEXT,
  ADD COLUMN "storeName" TEXT,
  ALTER COLUMN "address" DROP NOT NULL,
  ALTER COLUMN "lat" DROP NOT NULL,
  ALTER COLUMN "lng" DROP NOT NULL;
CREATE UNIQUE INDEX "WarehouseManualDispatch_requestId_key" ON "WarehouseManualDispatch"("requestId");
ALTER TABLE "WarehouseManualDispatch" ADD CONSTRAINT "WarehouseManualDispatch_coordinates_check"
  CHECK (("lat" IS NULL AND "lng" IS NULL) OR
    ("lat" IS NOT NULL AND "lng" IS NOT NULL AND "lat" BETWEEN -90 AND 90 AND "lng" BETWEEN -180 AND 180));
ALTER TABLE "WarehouseManualDispatchItem"
  ADD COLUMN "productName" TEXT,
  ADD COLUMN "productSku" TEXT,
  ADD COLUMN "unitPrice" DECIMAL(18,2);
-- Historical prices remain unknown; today's price must not rewrite old documents.
