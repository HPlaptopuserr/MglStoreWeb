CREATE TYPE "OrganizationTaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

CREATE TYPE "OrganizationTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');

CREATE TABLE "OrganizationTask" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" "OrganizationTaskPriority" NOT NULL DEFAULT 'NORMAL',
  "dueAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "OrganizationTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationTaskAssignee" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "OrganizationTaskStatus" NOT NULL DEFAULT 'PENDING',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrganizationTaskAssignee_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizationTask_organizationId_idx" ON "OrganizationTask"("organizationId");
CREATE INDEX "OrganizationTask_createdById_idx" ON "OrganizationTask"("createdById");
CREATE INDEX "OrganizationTask_priority_idx" ON "OrganizationTask"("priority");
CREATE INDEX "OrganizationTask_dueAt_idx" ON "OrganizationTask"("dueAt");
CREATE INDEX "OrganizationTask_deletedAt_idx" ON "OrganizationTask"("deletedAt");

CREATE UNIQUE INDEX "OrganizationTaskAssignee_taskId_userId_key" ON "OrganizationTaskAssignee"("taskId", "userId");
CREATE INDEX "OrganizationTaskAssignee_taskId_idx" ON "OrganizationTaskAssignee"("taskId");
CREATE INDEX "OrganizationTaskAssignee_userId_idx" ON "OrganizationTaskAssignee"("userId");
CREATE INDEX "OrganizationTaskAssignee_status_idx" ON "OrganizationTaskAssignee"("status");

ALTER TABLE "OrganizationTask"
ADD CONSTRAINT "OrganizationTask_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationTask"
ADD CONSTRAINT "OrganizationTask_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrganizationTaskAssignee"
ADD CONSTRAINT "OrganizationTaskAssignee_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "OrganizationTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationTaskAssignee"
ADD CONSTRAINT "OrganizationTaskAssignee_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
