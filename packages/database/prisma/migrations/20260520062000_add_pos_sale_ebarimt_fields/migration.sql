-- Add optional eBarimt receipt metadata to POS sales.
ALTER TABLE "PosSale"
  ADD COLUMN IF NOT EXISTS "ebarimtStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "ebarimtBillId" TEXT,
  ADD COLUMN IF NOT EXISTS "ebarimtReceiptId" TEXT,
  ADD COLUMN IF NOT EXISTS "ebarimtQrData" TEXT,
  ADD COLUMN IF NOT EXISTS "ebarimtLottery" TEXT,
  ADD COLUMN IF NOT EXISTS "ebarimtDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ebarimtError" TEXT,
  ADD COLUMN IF NOT EXISTS "ebarimtPayload" JSONB,
  ADD COLUMN IF NOT EXISTS "ebarimtSyncedAt" TIMESTAMP(3);
