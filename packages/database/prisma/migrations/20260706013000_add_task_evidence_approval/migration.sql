ALTER TYPE "OrganizationTaskStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';

CREATE TYPE "OrganizationTaskApprovalAction" AS ENUM ('SUBMITTED', 'APPROVED');

ALTER TABLE "OrganizationTaskAssignee"
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedById" TEXT;

CREATE TABLE "OrganizationTaskEvidenceImage" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "assigneeId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "originalName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationTaskEvidenceImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationTaskApprovalLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "assigneeId" TEXT NOT NULL,
    "approvedById" TEXT NOT NULL,
    "action" "OrganizationTaskApprovalAction" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationTaskApprovalLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizationTaskAssignee_approvedById_idx" ON "OrganizationTaskAssignee"("approvedById");
CREATE INDEX "OrganizationTaskEvidenceImage_assigneeId_idx" ON "OrganizationTaskEvidenceImage"("assigneeId");
CREATE INDEX "OrganizationTaskApprovalLog_assigneeId_idx" ON "OrganizationTaskApprovalLog"("assigneeId");
CREATE INDEX "OrganizationTaskApprovalLog_approvedById_idx" ON "OrganizationTaskApprovalLog"("approvedById");
CREATE INDEX "OrganizationTaskApprovalLog_action_idx" ON "OrganizationTaskApprovalLog"("action");

ALTER TABLE "OrganizationTaskEvidenceImage"
ADD CONSTRAINT "OrganizationTaskEvidenceImage_assigneeId_fkey"
FOREIGN KEY ("assigneeId") REFERENCES "OrganizationTaskAssignee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationTaskApprovalLog"
ADD CONSTRAINT "OrganizationTaskApprovalLog_assigneeId_fkey"
FOREIGN KEY ("assigneeId") REFERENCES "OrganizationTaskAssignee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationTaskApprovalLog"
ADD CONSTRAINT "OrganizationTaskApprovalLog_approvedById_fkey"
FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
