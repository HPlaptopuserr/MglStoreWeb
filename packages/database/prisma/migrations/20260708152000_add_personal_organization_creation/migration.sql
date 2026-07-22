ALTER TYPE "OrgStatus" ADD VALUE IF NOT EXISTS 'PENDING';

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "nameNormalized" TEXT;

CREATE INDEX IF NOT EXISTS "Organization_nameNormalized_idx"
  ON "Organization"("nameNormalized");

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_nameNormalized_active_key"
  ON "Organization"("nameNormalized")
  WHERE "nameNormalized" IS NOT NULL AND "deletedAt" IS NULL;
