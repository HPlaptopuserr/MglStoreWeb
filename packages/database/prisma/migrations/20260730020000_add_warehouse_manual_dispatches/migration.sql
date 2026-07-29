CREATE TABLE "WarehouseManualDispatch" (
    "id" TEXT NOT NULL,
    "dispatchNumber" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseManualDispatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WarehouseManualDispatchItem" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "WarehouseManualDispatchItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WarehouseManualDispatch_dispatchNumber_key"
ON "WarehouseManualDispatch"("dispatchNumber");
CREATE INDEX "WarehouseManualDispatch_warehouseId_createdAt_idx"
ON "WarehouseManualDispatch"("warehouseId", "createdAt");
CREATE INDEX "WarehouseManualDispatch_createdById_idx"
ON "WarehouseManualDispatch"("createdById");
CREATE INDEX "WarehouseManualDispatch_address_idx"
ON "WarehouseManualDispatch"("address");
CREATE UNIQUE INDEX "WarehouseManualDispatchItem_dispatchId_productId_key"
ON "WarehouseManualDispatchItem"("dispatchId", "productId");
CREATE INDEX "WarehouseManualDispatchItem_productId_idx"
ON "WarehouseManualDispatchItem"("productId");

ALTER TABLE "WarehouseManualDispatch"
ADD CONSTRAINT "WarehouseManualDispatch_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseManualDispatch"
ADD CONSTRAINT "WarehouseManualDispatch_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseManualDispatchItem"
ADD CONSTRAINT "WarehouseManualDispatchItem_dispatchId_fkey"
FOREIGN KEY ("dispatchId") REFERENCES "WarehouseManualDispatch"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseManualDispatchItem"
ADD CONSTRAINT "WarehouseManualDispatchItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
