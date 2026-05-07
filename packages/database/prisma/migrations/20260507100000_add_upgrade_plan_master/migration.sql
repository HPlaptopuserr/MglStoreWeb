-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('PENDING', 'SIGNED', 'EXPIRED', 'TAMPERED');

-- AlterTable
ALTER TABLE "CardPaymentAttempt" ADD COLUMN     "traceno" TEXT;

-- AlterTable
ALTER TABLE "OrgUpgradePlan" ADD COLUMN     "planId" TEXT;

-- CreateTable
CREATE TABLE "UpgradePlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(18,2) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "maxProducts" INTEGER NOT NULL,
    "maxImages" INTEGER NOT NULL,
    "maxCategories" INTEGER NOT NULL,
    "hasBanner" BOOLEAN NOT NULL DEFAULT false,
    "hasAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "isTrial" BOOLEAN NOT NULL DEFAULT false,
    "badge" TEXT,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpgradePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1.0',
    "status" "ContractStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "feePlan" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT,
    "pdfUrl" TEXT,
    "documentHash" TEXT,
    "otpSecret" TEXT,
    "adminSignature" TEXT,
    "adminName" TEXT,
    "adminTitle" TEXT,
    "adminStamp" TEXT,
    "qpayInvoiceId" TEXT,
    "memberData" JSONB,
    "memberSignature" TEXT,
    "headerData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "signedAt" TIMESTAMP(3),

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractAuditLog" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceInfo" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UpgradePlan_code_key" ON "UpgradePlan"("code");

-- CreateIndex
CREATE INDEX "UpgradePlan_isActive_idx" ON "UpgradePlan"("isActive");

-- CreateIndex
CREATE INDEX "UpgradePlan_sortOrder_idx" ON "UpgradePlan"("sortOrder");

-- CreateIndex
CREATE INDEX "Contract_userId_idx" ON "Contract"("userId");

-- CreateIndex
CREATE INDEX "Contract_organizationId_idx" ON "Contract"("organizationId");

-- CreateIndex
CREATE INDEX "Contract_documentHash_idx" ON "Contract"("documentHash");

-- CreateIndex
CREATE INDEX "Contract_templateId_idx" ON "Contract"("templateId");

-- CreateIndex
CREATE INDEX "Contract_isTemplate_idx" ON "Contract"("isTemplate");

-- CreateIndex
CREATE INDEX "ContractAuditLog_contractId_idx" ON "ContractAuditLog"("contractId");

-- CreateIndex
CREATE INDEX "ContractAuditLog_timestamp_idx" ON "ContractAuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "OrgUpgradePlan_planId_idx" ON "OrgUpgradePlan"("planId");

-- AddForeignKey
ALTER TABLE "OrgUpgradePlan" ADD CONSTRAINT "OrgUpgradePlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "UpgradePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAuditLog" ADD CONSTRAINT "ContractAuditLog_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
