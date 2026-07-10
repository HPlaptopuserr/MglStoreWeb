ALTER TABLE "OrganizationTaskAssignee"
ADD COLUMN "performanceStars" INTEGER,
ADD COLUMN "productivityPercent" INTEGER,
ADD COLUMN "evaluationNote" TEXT;

ALTER TABLE "OrganizationTaskAssignee"
ADD CONSTRAINT "OrganizationTaskAssignee_performanceStars_check"
CHECK ("performanceStars" IS NULL OR ("performanceStars" >= 1 AND "performanceStars" <= 10));

ALTER TABLE "OrganizationTaskAssignee"
ADD CONSTRAINT "OrganizationTaskAssignee_productivityPercent_check"
CHECK ("productivityPercent" IS NULL OR ("productivityPercent" >= 0 AND "productivityPercent" <= 100));
