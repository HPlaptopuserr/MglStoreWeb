ALTER TABLE "WarehouseManualDispatch"
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelledById" TEXT,
  ADD COLUMN "cancellationReason" TEXT;

ALTER TABLE "WarehouseManualDispatch"
  ADD CONSTRAINT "WarehouseManualDispatch_receipt_state_check"
  CHECK ("acceptedAt" IS NULL OR "cancelledAt" IS NULL);
