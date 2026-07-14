ALTER TABLE "Organization"
  ADD COLUMN "ceoServiceEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ceoAdviceNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "ceoCalendarRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "ceoWeeklyDigestEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "ceoRiskAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "ceoKpiInsightsEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "ceoDecisionBriefEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "CeoNotificationDelivery" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "referenceKey" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CeoNotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CeoNotificationDelivery_organizationId_userId_type_referenceKey_key"
  ON "CeoNotificationDelivery"("organizationId", "userId", "type", "referenceKey");
CREATE INDEX "CeoNotificationDelivery_organizationId_sentAt_idx"
  ON "CeoNotificationDelivery"("organizationId", "sentAt");
CREATE INDEX "CeoNotificationDelivery_userId_sentAt_idx"
  ON "CeoNotificationDelivery"("userId", "sentAt");
