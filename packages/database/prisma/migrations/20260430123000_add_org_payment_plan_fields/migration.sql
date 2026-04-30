-- Add organization-level QPay and paid plan fields that exist in the Prisma schema.
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "qpayMerchantId" TEXT,
  ADD COLUMN IF NOT EXISTS "qpayMerchantKey" TEXT,
  ADD COLUMN IF NOT EXISTS "qpayEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "qpayConnectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "subdomainEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "planType" TEXT,
  ADD COLUMN IF NOT EXISTS "planActivatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "trialUsed" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_qpayMerchantId_key"
  ON "Organization"("qpayMerchantId");

CREATE INDEX IF NOT EXISTS "Organization_subdomainEnabled_idx"
  ON "Organization"("subdomainEnabled");

DO $$
BEGIN
  CREATE TYPE "PlanPaymentStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OrgUpgradePlan" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planType" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "invoiceNo" TEXT NOT NULL,
  "qrText" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "status" "PlanPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrgUpgradePlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrgUpgradePlan_invoiceId_key"
  ON "OrgUpgradePlan"("invoiceId");

CREATE UNIQUE INDEX IF NOT EXISTS "OrgUpgradePlan_invoiceNo_key"
  ON "OrgUpgradePlan"("invoiceNo");

CREATE INDEX IF NOT EXISTS "OrgUpgradePlan_organizationId_idx"
  ON "OrgUpgradePlan"("organizationId");

CREATE INDEX IF NOT EXISTS "OrgUpgradePlan_status_idx"
  ON "OrgUpgradePlan"("status");

CREATE INDEX IF NOT EXISTS "OrgUpgradePlan_invoiceId_idx"
  ON "OrgUpgradePlan"("invoiceId");

CREATE INDEX IF NOT EXISTS "OrgUpgradePlan_createdAt_idx"
  ON "OrgUpgradePlan"("createdAt");

DO $$
BEGIN
  ALTER TABLE "OrgUpgradePlan"
    ADD CONSTRAINT "OrgUpgradePlan_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
