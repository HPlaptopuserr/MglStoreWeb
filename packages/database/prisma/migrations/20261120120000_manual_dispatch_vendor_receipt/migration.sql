ALTER TABLE "WarehouseManualDispatch"
  ADD COLUMN "recipientOrganizationId" TEXT,
  ADD COLUMN "acceptedAt" TIMESTAMP(3),
  ADD COLUMN "acceptedById" TEXT;
ALTER TABLE "WarehouseManualDispatchItem"
  ADD COLUMN "productSnapshot" JSONB,
  ADD COLUMN "receivedProductId" TEXT;
CREATE INDEX "WarehouseManualDispatch_recipientOrganizationId_createdAt_idx"
  ON "WarehouseManualDispatch"("recipientOrganizationId", "createdAt");
ALTER TABLE "WarehouseManualDispatch" ADD CONSTRAINT "WarehouseManualDispatch_recipientOrganizationId_fkey"
  FOREIGN KEY ("recipientOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
