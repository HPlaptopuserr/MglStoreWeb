-- CreateTable
CREATE TABLE "OrganizationGroup" (
    "id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "pendingOwnerId" TEXT,
    "ownershipExpiresAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "headCompanyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "allCompanies" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupCompany" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sharedPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),

    CONSTRAINT "GroupCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMemberCompanyAccess" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "GroupMemberCompanyAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupPersonInvitation" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'IN_APP',
    "groupId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "role" TEXT NOT NULL,
    "allCompanies" BOOLEAN NOT NULL DEFAULT false,
    "companyIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupPersonInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupCompanyInvitation" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupCompanyInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupAuditLog" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationGroup_ownerId_idx" ON "OrganizationGroup"("ownerId");

-- CreateIndex
CREATE INDEX "GroupMember_userId_revokedAt_idx" ON "GroupMember"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_id_groupId_key" ON "GroupMember"("id", "groupId");

-- CreateIndex
CREATE INDEX "GroupCompany_organizationId_disconnectedAt_idx" ON "GroupCompany"("organizationId", "disconnectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GroupCompany_groupId_organizationId_key" ON "GroupCompany"("groupId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupCompany_id_groupId_key" ON "GroupCompany"("id", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMemberCompanyAccess_memberId_companyId_key" ON "GroupMemberCompanyAccess"("memberId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupPersonInvitation_tokenHash_key" ON "GroupPersonInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "GroupPersonInvitation_recipient_status_idx" ON "GroupPersonInvitation"("recipient", "status");

-- CreateIndex
CREATE INDEX "GroupPersonInvitation_groupId_status_idx" ON "GroupPersonInvitation"("groupId", "status");

-- CreateIndex
CREATE INDEX "GroupCompanyInvitation_organizationId_status_idx" ON "GroupCompanyInvitation"("organizationId", "status");

-- CreateIndex
CREATE INDEX "GroupCompanyInvitation_groupId_status_idx" ON "GroupCompanyInvitation"("groupId", "status");

-- CreateIndex
CREATE INDEX "GroupAuditLog_groupId_createdAt_idx" ON "GroupAuditLog"("groupId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrganizationGroup" ADD CONSTRAINT "OrganizationGroup_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationGroup" ADD CONSTRAINT "OrganizationGroup_headCompanyId_fkey" FOREIGN KEY ("headCompanyId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OrganizationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCompany" ADD CONSTRAINT "GroupCompany_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OrganizationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCompany" ADD CONSTRAINT "GroupCompany_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMemberCompanyAccess" ADD CONSTRAINT "GroupMemberCompanyAccess_memberId_groupId_fkey" FOREIGN KEY ("memberId", "groupId") REFERENCES "GroupMember"("id", "groupId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMemberCompanyAccess" ADD CONSTRAINT "GroupMemberCompanyAccess_companyId_groupId_fkey" FOREIGN KEY ("companyId", "groupId") REFERENCES "GroupCompany"("id", "groupId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPersonInvitation" ADD CONSTRAINT "GroupPersonInvitation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OrganizationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCompanyInvitation" ADD CONSTRAINT "GroupCompanyInvitation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OrganizationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCompanyInvitation" ADD CONSTRAINT "GroupCompanyInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupAuditLog" ADD CONSTRAINT "GroupAuditLog_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OrganizationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Domain guards also cover administrative writes outside the API.
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_role_check" CHECK ("role" IN ('OWNER','ADMIN','MANAGER'));
ALTER TABLE "GroupPersonInvitation" ADD CONSTRAINT "GroupPersonInvitation_role_check" CHECK ("role" IN ('ADMIN','MANAGER'));
ALTER TABLE "GroupPersonInvitation" ADD CONSTRAINT "GroupPersonInvitation_status_check" CHECK ("status" IN ('PENDING','ACCEPTED','REJECTED','CANCELLED','EXPIRED'));
ALTER TABLE "GroupCompanyInvitation" ADD CONSTRAINT "GroupCompanyInvitation_status_check" CHECK ("status" IN ('PENDING','ACCEPTED','REJECTED','CANCELLED','EXPIRED'));
CREATE UNIQUE INDEX "GroupPersonInvitation_pending_unique" ON "GroupPersonInvitation" ("groupId", "recipient") WHERE "status" = 'PENDING';
CREATE UNIQUE INDEX "GroupCompanyInvitation_pending_unique" ON "GroupCompanyInvitation" ("groupId", "organizationId") WHERE "status" = 'PENDING';
ALTER TABLE "OrganizationGroup" ADD CONSTRAINT "OrganizationGroup_head_in_group_fkey" FOREIGN KEY ("id", "headCompanyId") REFERENCES "GroupCompany" ("groupId", "organizationId") DEFERRABLE INITIALLY DEFERRED;

CREATE UNIQUE INDEX "GroupMember_single_owner" ON "GroupMember" ("groupId") WHERE "role" = 'OWNER';
