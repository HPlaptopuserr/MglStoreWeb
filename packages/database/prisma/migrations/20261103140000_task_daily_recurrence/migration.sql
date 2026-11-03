ALTER TABLE "OrganizationTask"
  ADD COLUMN "recurrenceKey" TEXT,
  ADD COLUMN "recurrenceDate" TEXT,
  ADD COLUMN "recurrenceThrough" TEXT,
  ADD COLUMN "recurrenceTimeZone" TEXT,
  ADD COLUMN "recurrenceFingerprint" TEXT;
CREATE UNIQUE INDEX "OrganizationTask_daily_occurrence_key"
  ON "OrganizationTask"("organizationId", "createdById", "recurrenceKey", "recurrenceDate");
ALTER TABLE "OrganizationTask" ADD CONSTRAINT "OrganizationTask_recurrence_complete"
  CHECK (("recurrenceKey" IS NULL AND "recurrenceDate" IS NULL AND "recurrenceThrough" IS NULL AND "recurrenceTimeZone" IS NULL AND "recurrenceFingerprint" IS NULL)
    OR ("recurrenceKey" IS NOT NULL AND "recurrenceDate" IS NOT NULL AND "recurrenceThrough" IS NOT NULL AND "recurrenceTimeZone" IS NOT NULL AND "recurrenceFingerprint" IS NOT NULL));
