CREATE TABLE "OrganizationTaskComment" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationTaskComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizationTaskComment_taskId_idx" ON "OrganizationTaskComment"("taskId");
CREATE INDEX "OrganizationTaskComment_authorId_idx" ON "OrganizationTaskComment"("authorId");
CREATE INDEX "OrganizationTaskComment_createdAt_idx" ON "OrganizationTaskComment"("createdAt");
CREATE INDEX "OrganizationTaskComment_deletedAt_idx" ON "OrganizationTaskComment"("deletedAt");

ALTER TABLE "OrganizationTaskComment"
ADD CONSTRAINT "OrganizationTaskComment_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "OrganizationTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationTaskComment"
ADD CONSTRAINT "OrganizationTaskComment_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
