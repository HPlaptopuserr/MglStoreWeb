-- CreateEnum
CREATE TYPE "AssociationMembershipType" AS ENUM ('BASIC', 'ACTIVE', 'BRANCH_COUNCIL', 'GOVERNING_COUNCIL');

-- CreateTable
CREATE TABLE "AssociationMemberRegistration" (
    "id" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "education" TEXT,
    "profession" TEXT,
    "organizationName" TEXT NOT NULL,
    "businessActivity" TEXT,
    "foundedYear" TEXT,
    "address" TEXT NOT NULL,
    "experience" TEXT,
    "phone" TEXT NOT NULL,
    "membershipType" "AssociationMembershipType" NOT NULL,
    "durationMonths" INTEGER,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssociationMemberRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssociationMemberRegistration_status_idx" ON "AssociationMemberRegistration"("status");

-- CreateIndex
CREATE INDEX "AssociationMemberRegistration_membershipType_idx" ON "AssociationMemberRegistration"("membershipType");

-- CreateIndex
CREATE INDEX "AssociationMemberRegistration_createdAt_idx" ON "AssociationMemberRegistration"("createdAt");

-- CreateIndex
CREATE INDEX "AssociationMemberRegistration_phone_idx" ON "AssociationMemberRegistration"("phone");
