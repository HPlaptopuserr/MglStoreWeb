-- Existing viewing grants remain read-only. No historical consent is widened.
ALTER TABLE "OrganizationTask" ADD COLUMN "sourceGroupId" TEXT, ADD COLUMN "clientRequestId" TEXT;
ALTER TABLE "OrganizationTask" ADD CONSTRAINT "OrganizationTask_sourceGroupId_fkey" FOREIGN KEY ("sourceGroupId") REFERENCES "OrganizationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "OrganizationTask_sourceGroupId_clientRequestId_key" ON "OrganizationTask"("sourceGroupId", "clientRequestId");
ALTER TABLE "OrganizationTask" ADD CONSTRAINT "OrganizationTask_group_request_check" CHECK (("sourceGroupId" IS NULL) = ("clientRequestId" IS NULL));

CREATE INDEX "OrganizationTask_organizationId_deletedAt_id_idx" ON "OrganizationTask"("organizationId", "deletedAt", "id");
