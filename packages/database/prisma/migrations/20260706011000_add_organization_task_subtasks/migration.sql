CREATE TABLE "OrganizationTaskSubTask" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationTaskSubTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizationTaskSubTask_taskId_idx" ON "OrganizationTaskSubTask"("taskId");
CREATE INDEX "OrganizationTaskSubTask_isCompleted_idx" ON "OrganizationTaskSubTask"("isCompleted");

ALTER TABLE "OrganizationTaskSubTask"
ADD CONSTRAINT "OrganizationTaskSubTask_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "OrganizationTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
