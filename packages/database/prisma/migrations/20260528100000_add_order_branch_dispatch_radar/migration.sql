-- Order branch dispatch radar: customer location + nearest branch accept/decline attempts.

CREATE TYPE "OrderDispatchAttemptStatus" AS ENUM (
  'QUEUED',
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED'
);

ALTER TABLE "Order"
  ADD COLUMN "branchId" TEXT,
  ADD COLUMN "customerLat" DOUBLE PRECISION,
  ADD COLUMN "customerLng" DOUBLE PRECISION;

CREATE TABLE "OrderDispatchAttempt" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "status" "OrderDispatchAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "sequence" INTEGER NOT NULL,
  "distanceKm" DOUBLE PRECISION,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  "respondedById" TEXT,
  "expiresAt" TIMESTAMP(3),
  "note" TEXT,

  CONSTRAINT "OrderDispatchAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderDispatchAttempt_orderId_branchId_key"
  ON "OrderDispatchAttempt"("orderId", "branchId");

CREATE INDEX "Order_branchId_idx" ON "Order"("branchId");
CREATE INDEX "OrderDispatchAttempt_orderId_status_idx" ON "OrderDispatchAttempt"("orderId", "status");
CREATE INDEX "OrderDispatchAttempt_branchId_status_idx" ON "OrderDispatchAttempt"("branchId", "status");
CREATE INDEX "OrderDispatchAttempt_organizationId_status_idx" ON "OrderDispatchAttempt"("organizationId", "status");
CREATE INDEX "OrderDispatchAttempt_requestedAt_idx" ON "OrderDispatchAttempt"("requestedAt");

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderDispatchAttempt"
  ADD CONSTRAINT "OrderDispatchAttempt_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderDispatchAttempt"
  ADD CONSTRAINT "OrderDispatchAttempt_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderDispatchAttempt"
  ADD CONSTRAINT "OrderDispatchAttempt_respondedById_fkey"
  FOREIGN KEY ("respondedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
