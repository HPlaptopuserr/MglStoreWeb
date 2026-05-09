-- CreateEnum
CREATE TYPE "CardTerminalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CARD_TERMINAL_REQUEST_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CARD_TERMINAL_REQUEST_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'CARD_TERMINAL_REQUEST_REJECTED';

-- CreateTable
CREATE TABLE "CardTerminalRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "providerType" TEXT NOT NULL,
    "businessNote" TEXT,
    "status" "CardTerminalRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "cardTerminalId" TEXT,
    "terminalBridgeUrl" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardTerminalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardTerminalRequest_organizationId_idx" ON "CardTerminalRequest"("organizationId");

-- CreateIndex
CREATE INDEX "CardTerminalRequest_status_idx" ON "CardTerminalRequest"("status");

-- CreateIndex
CREATE INDEX "CardTerminalRequest_createdAt_idx" ON "CardTerminalRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "CardTerminalRequest" ADD CONSTRAINT "CardTerminalRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTerminalRequest" ADD CONSTRAINT "CardTerminalRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
