DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CashDrawerEventType') THEN
    CREATE TYPE "CashDrawerEventType" AS ENUM ('PAID_IN', 'PAID_OUT', 'OPEN_DRAWER');
  END IF;
END $$;

ALTER TABLE "PosShift"
  ADD COLUMN IF NOT EXISTS "cashCount" JSONB,
  ADD COLUMN IF NOT EXISTS "cashCountedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "PosCashDrawerEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "registerId" TEXT,
  "shiftId" TEXT NOT NULL,
  "cashierId" TEXT NOT NULL,
  "type" "CashDrawerEventType" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PosCashDrawerEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PosCashDrawerEvent_organizationId_idx" ON "PosCashDrawerEvent"("organizationId");
CREATE INDEX IF NOT EXISTS "PosCashDrawerEvent_branchId_idx" ON "PosCashDrawerEvent"("branchId");
CREATE INDEX IF NOT EXISTS "PosCashDrawerEvent_registerId_idx" ON "PosCashDrawerEvent"("registerId");
CREATE INDEX IF NOT EXISTS "PosCashDrawerEvent_shiftId_idx" ON "PosCashDrawerEvent"("shiftId");
CREATE INDEX IF NOT EXISTS "PosCashDrawerEvent_cashierId_idx" ON "PosCashDrawerEvent"("cashierId");
CREATE INDEX IF NOT EXISTS "PosCashDrawerEvent_type_idx" ON "PosCashDrawerEvent"("type");
CREATE INDEX IF NOT EXISTS "PosCashDrawerEvent_createdAt_idx" ON "PosCashDrawerEvent"("createdAt");
