/*
  Warnings:

  - You are about to drop the column `jobPosition` on the `JobApplication` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "JobApplication" DROP COLUMN "jobPosition",
ADD COLUMN     "jobPositionId" TEXT;

-- CreateTable
CREATE TABLE "JobPosition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobPosition_slug_key" ON "JobPosition"("slug");

-- CreateIndex
CREATE INDEX "JobPosition_isActive_idx" ON "JobPosition"("isActive");

-- CreateIndex
CREATE INDEX "JobPosition_sortOrder_idx" ON "JobPosition"("sortOrder");

-- CreateIndex
CREATE INDEX "JobApplication_jobPositionId_idx" ON "JobApplication"("jobPositionId");

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobPositionId_fkey" FOREIGN KEY ("jobPositionId") REFERENCES "JobPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
