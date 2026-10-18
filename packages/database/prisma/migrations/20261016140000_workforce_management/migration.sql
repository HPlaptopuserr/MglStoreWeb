-- AlterTable
ALTER TABLE "OrganizationMember" ADD COLUMN     "employmentEndReason" TEXT,
ADD COLUMN     "employmentEndedAt" DATE,
ADD COLUMN     "employmentEndedBy" TEXT;

-- CreateTable
CREATE TABLE "WorkforceDepartment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "managerId" TEXT,

    CONSTRAINT "WorkforceDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforceShift" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 60,
    "weekdays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "color" TEXT NOT NULL DEFAULT '#5b8cff',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WorkforceShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforceAssignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "from" DATE NOT NULL,
    "to" DATE NOT NULL,
    "zoneId" TEXT,

    CONSTRAINT "WorkforceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforceRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL,
    "direction" TEXT,
    "zoneId" TEXT,
    "recordId" TEXT,
    "decisionNote" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkforceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforcePolicy" (
    "organizationId" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Ulaanbaatar',
    "lateGraceMinutes" INTEGER NOT NULL DEFAULT 0,
    "features" JSONB NOT NULL DEFAULT '{}',
    "requestKinds" TEXT[] DEFAULT ARRAY['REMOTE', 'CORRECTION', 'LEAVE', 'OVERTIME']::TEXT[],
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkforcePolicy_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "WorkforceNotice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userIds" TEXT[],
    "readBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkforceNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforceApiToken" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scopes" TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "WorkforceApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforceAudit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkforceAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforceSubscription" (
    "organizationId" TEXT NOT NULL,
    "planName" TEXT NOT NULL DEFAULT 'Үндсэн',
    "expiresAt" TIMESTAMP(3),
    "seatUnitPrice" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'MNT',
    "addons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkforceSubscription_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "WorkforceBillingOrder" (
    "kind" TEXT NOT NULL DEFAULT 'SEATS',
    "addonCode" TEXT,
    "providerPaymentId" TEXT,
    "invoiceData" JSONB,
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "WorkforceBillingOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforcePulse" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkforcePulse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforceTrackingPreference" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkforceTrackingPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforceLocationPoint" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkforceLocationPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforceMailCampaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkforceMailCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforceMailDelivery" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkforceMailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkforceDepartment_organizationId_idx" ON "WorkforceDepartment"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkforceDepartment_organizationId_name_key" ON "WorkforceDepartment"("organizationId", "name");

-- CreateIndex
CREATE INDEX "WorkforceShift_organizationId_idx" ON "WorkforceShift"("organizationId");

-- CreateIndex
CREATE INDEX "WorkforceAssignment_organizationId_userId_from_to_idx" ON "WorkforceAssignment"("organizationId", "userId", "from", "to");

-- CreateIndex
CREATE INDEX "WorkforceRequest_organizationId_state_createdAt_idx" ON "WorkforceRequest"("organizationId", "state", "createdAt");

-- CreateIndex
CREATE INDEX "WorkforceRequest_organizationId_userId_from_idx" ON "WorkforceRequest"("organizationId", "userId", "from");

-- CreateIndex
CREATE INDEX "WorkforceNotice_organizationId_createdAt_idx" ON "WorkforceNotice"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkforceApiToken_tokenHash_key" ON "WorkforceApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "WorkforceApiToken_organizationId_idx" ON "WorkforceApiToken"("organizationId");

-- CreateIndex
CREATE INDEX "WorkforceAudit_organizationId_createdAt_idx" ON "WorkforceAudit"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkforceBillingOrder_providerPaymentId_key" ON "WorkforceBillingOrder"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkforceBillingOrder_idempotencyKey_key" ON "WorkforceBillingOrder"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "WorkforceBillingOrder_invoiceId_key" ON "WorkforceBillingOrder"("invoiceId");

-- CreateIndex
CREATE INDEX "WorkforceBillingOrder_organizationId_createdAt_idx" ON "WorkforceBillingOrder"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkforcePulse_organizationId_date_idx" ON "WorkforcePulse"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WorkforcePulse_organizationId_userId_date_key" ON "WorkforcePulse"("organizationId", "userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WorkforceTrackingPreference_organizationId_userId_key" ON "WorkforceTrackingPreference"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "WorkforceLocationPoint_organizationId_userId_capturedAt_idx" ON "WorkforceLocationPoint"("organizationId", "userId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkforceMailCampaign_idempotencyKey_key" ON "WorkforceMailCampaign"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WorkforceMailCampaign_organizationId_createdAt_idx" ON "WorkforceMailCampaign"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkforceMailDelivery_state_updatedAt_idx" ON "WorkforceMailDelivery"("state", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkforceMailDelivery_campaignId_userId_key" ON "WorkforceMailDelivery"("campaignId", "userId");

-- AddForeignKey
ALTER TABLE "WorkforceDepartment" ADD CONSTRAINT "WorkforceDepartment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforceShift" ADD CONSTRAINT "WorkforceShift_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforceAssignment" ADD CONSTRAINT "WorkforceAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforceAssignment" ADD CONSTRAINT "WorkforceAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "WorkforceShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforceRequest" ADD CONSTRAINT "WorkforceRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforcePolicy" ADD CONSTRAINT "WorkforcePolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforceNotice" ADD CONSTRAINT "WorkforceNotice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforceApiToken" ADD CONSTRAINT "WorkforceApiToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforceAudit" ADD CONSTRAINT "WorkforceAudit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforceSubscription" ADD CONSTRAINT "WorkforceSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforceBillingOrder" ADD CONSTRAINT "WorkforceBillingOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforcePulse" ADD CONSTRAINT "WorkforcePulse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforceTrackingPreference" ADD CONSTRAINT "WorkforceTrackingPreference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforceLocationPoint" ADD CONSTRAINT "WorkforceLocationPoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforceMailCampaign" ADD CONSTRAINT "WorkforceMailCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforceMailDelivery" ADD CONSTRAINT "WorkforceMailDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WorkforceMailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Approved corrections may have no captured device location.
ALTER TABLE "AttendanceRecord" ALTER COLUMN "clockInLat" DROP NOT NULL, ALTER COLUMN "clockInLng" DROP NOT NULL;
