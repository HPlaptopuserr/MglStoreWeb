ALTER TABLE "OrganizationTask" ADD COLUMN "plannedStartAt" TIMESTAMP(3), ADD COLUMN "planPeriod" TEXT;
ALTER TABLE "OrganizationTask" ADD CONSTRAINT "OrganizationTask_plan_period_value" CHECK ("planPeriod" IS NULL OR "planPeriod" IN ('WEEK', 'MONTH', 'QUARTER', 'YEAR'));
