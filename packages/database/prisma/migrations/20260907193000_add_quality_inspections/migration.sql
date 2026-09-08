ALTER TYPE "Capability" ADD VALUE IF NOT EXISTS 'QUALITY_INSPECTION_PERFORM';
ALTER TYPE "Capability" ADD VALUE IF NOT EXISTS 'QUALITY_INSPECTION_REVIEW';
ALTER TYPE "Capability" ADD VALUE IF NOT EXISTS 'QUALITY_TEMPLATE_MANAGE';
ALTER TYPE "Capability" ADD VALUE IF NOT EXISTS 'QUALITY_REPORT_VIEW';

CREATE TABLE "QualityChecklistTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "schema" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QualityChecklistTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QualityInspection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "templateSnapshot" JSONB NOT NULL,
    "answers" JSONB NOT NULL,
    "scoreEarned" INTEGER NOT NULL,
    "scorePossible" INTEGER NOT NULL,
    "scorePercent" DOUBLE PRECISION NOT NULL,
    "result" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QualityInspection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QualityChecklistTemplate_organizationId_version_key"
ON "QualityChecklistTemplate"("organizationId", "version");
CREATE INDEX "QualityChecklistTemplate_organizationId_isActive_idx"
ON "QualityChecklistTemplate"("organizationId", "isActive");
CREATE INDEX "QualityInspection_organizationId_submittedAt_idx"
ON "QualityInspection"("organizationId", "submittedAt");
CREATE INDEX "QualityInspection_locationId_submittedAt_idx"
ON "QualityInspection"("locationId", "submittedAt");
CREATE INDEX "QualityInspection_inspectorId_submittedAt_idx"
ON "QualityInspection"("inspectorId", "submittedAt");

ALTER TABLE "QualityChecklistTemplate"
ADD CONSTRAINT "QualityChecklistTemplate_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QualityChecklistTemplate"
ADD CONSTRAINT "QualityChecklistTemplate_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QualityInspection"
ADD CONSTRAINT "QualityInspection_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QualityInspection"
ADD CONSTRAINT "QualityInspection_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "SalesVisitLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QualityInspection"
ADD CONSTRAINT "QualityInspection_inspectorId_fkey"
FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QualityInspection"
ADD CONSTRAINT "QualityInspection_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "QualityChecklistTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
