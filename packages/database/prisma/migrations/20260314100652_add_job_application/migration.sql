-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "registerNumber" TEXT,
    "age" INTEGER,
    "gender" "Gender",
    "address" TEXT,
    "jobPosition" TEXT,
    "education" TEXT,
    "salaryExpect" TEXT,
    "experience" TEXT,
    "professionalSkills" TEXT,
    "personalSkills" TEXT,
    "languages" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "rejectReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobApplication_status_idx" ON "JobApplication"("status");

-- CreateIndex
CREATE INDEX "JobApplication_createdAt_idx" ON "JobApplication"("createdAt");

-- CreateIndex
CREATE INDEX "JobApplication_phone_idx" ON "JobApplication"("phone");
