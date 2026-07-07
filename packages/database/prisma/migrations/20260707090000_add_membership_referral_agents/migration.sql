CREATE TYPE "ReferralCommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

CREATE TABLE "MembershipAgent" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 10,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "userId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MembershipAgent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MembershipReferralCommission" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "agentUserId" TEXT,
  "registrationId" TEXT NOT NULL,
  "paymentAmount" INTEGER NOT NULL,
  "commissionRate" DECIMAL(5,2) NOT NULL,
  "commissionAmount" INTEGER NOT NULL,
  "status" "ReferralCommissionStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MembershipReferralCommission_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AssociationMemberRegistration"
  ADD COLUMN "agentCode" TEXT,
  ADD COLUMN "agentId" TEXT,
  ADD COLUMN "agentCommissionRate" DECIMAL(5,2),
  ADD COLUMN "agentCommissionAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "agentCommissionStatus" "ReferralCommissionStatus";

CREATE UNIQUE INDEX "MembershipAgent_code_key" ON "MembershipAgent"("code");
CREATE UNIQUE INDEX "MembershipReferralCommission_registrationId_key" ON "MembershipReferralCommission"("registrationId");

CREATE INDEX "MembershipAgent_phone_idx" ON "MembershipAgent"("phone");
CREATE INDEX "MembershipAgent_email_idx" ON "MembershipAgent"("email");
CREATE INDEX "MembershipAgent_isActive_idx" ON "MembershipAgent"("isActive");
CREATE INDEX "MembershipAgent_userId_idx" ON "MembershipAgent"("userId");
CREATE INDEX "MembershipAgent_createdById_idx" ON "MembershipAgent"("createdById");
CREATE INDEX "MembershipAgent_createdAt_idx" ON "MembershipAgent"("createdAt");

CREATE INDEX "MembershipReferralCommission_agentId_idx" ON "MembershipReferralCommission"("agentId");
CREATE INDEX "MembershipReferralCommission_agentUserId_idx" ON "MembershipReferralCommission"("agentUserId");
CREATE INDEX "MembershipReferralCommission_status_idx" ON "MembershipReferralCommission"("status");
CREATE INDEX "MembershipReferralCommission_createdAt_idx" ON "MembershipReferralCommission"("createdAt");

CREATE INDEX "AssociationMemberRegistration_agentCode_idx" ON "AssociationMemberRegistration"("agentCode");
CREATE INDEX "AssociationMemberRegistration_agentId_idx" ON "AssociationMemberRegistration"("agentId");

ALTER TABLE "MembershipAgent"
  ADD CONSTRAINT "MembershipAgent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MembershipAgent"
  ADD CONSTRAINT "MembershipAgent_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssociationMemberRegistration"
  ADD CONSTRAINT "AssociationMemberRegistration_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "MembershipAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MembershipReferralCommission"
  ADD CONSTRAINT "MembershipReferralCommission_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "MembershipAgent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MembershipReferralCommission"
  ADD CONSTRAINT "MembershipReferralCommission_agentUserId_fkey"
  FOREIGN KEY ("agentUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MembershipReferralCommission"
  ADD CONSTRAINT "MembershipReferralCommission_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "AssociationMemberRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
