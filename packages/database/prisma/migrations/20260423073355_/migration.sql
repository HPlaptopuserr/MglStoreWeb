/*
  Warnings:

  - You are about to drop the column `organizationId` on the `Warehouse` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[organizationId,branchId,name]` on the table `PosRegister` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cardProviderType,cardTerminalId]` on the table `PosRegister` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[qpayMerchantId,qpayTerminalId]` on the table `PosRegister` will be added. If there are existing duplicate values, this will fail.
  - Made the column `requestedOrgType` on table `RegistrationRequest` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PosActivationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PosPaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'FAILED');

-- CreateEnum
CREATE TYPE "PosQPayStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('ANNOUNCEMENT', 'UPDATE', 'ALERT', 'PROMOTION', 'GENERAL');

-- CreateEnum
CREATE TYPE "AttendanceAuth" AS ENUM ('FINGERPRINT', 'FACE', 'PIN');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'EARLY_LEAVE', 'ABSENT');

-- CreateEnum
CREATE TYPE "ChatSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChatMessageSender" AS ENUM ('VISITOR', 'BOT', 'ADMIN');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "DmType" AS ENUM ('TEXT', 'VOICE', 'IMAGE', 'FILE');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PosSaleStatus" AS ENUM ('COMPLETED', 'VOIDED', 'REFUNDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'POS_REGISTER_CLAIMED';
ALTER TYPE "AuditAction" ADD VALUE 'POS_REGISTER_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'POS_REGISTER_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'POS_CARD_AUTHORIZED';
ALTER TYPE "AuditAction" ADD VALUE 'POS_QPAY_PAID';
ALTER TYPE "AuditAction" ADD VALUE 'POS_QPAY_WEBHOOK_RECEIVED';
ALTER TYPE "AuditAction" ADD VALUE 'POS_REGISTER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'POS_REGISTER_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'POS_SALE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'POS_REGISTER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'POS_QPAY_INVOICE_CREATED';

-- DropForeignKey
ALTER TABLE "ServicePost" DROP CONSTRAINT "ServicePost_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "StockRequestPayment" DROP CONSTRAINT "StockRequestPayment_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Warehouse" DROP CONSTRAINT "Warehouse_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "WarehouseStockRequest" DROP CONSTRAINT "WarehouseStockRequest_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "WarehouseStockRequest" DROP CONSTRAINT "WarehouseStockRequest_requestedById_fkey";

-- DropForeignKey
ALTER TABLE "WarehouseStockRequest" DROP CONSTRAINT "WarehouseStockRequest_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "WarehouseStockRequestItem" DROP CONSTRAINT "WarehouseStockRequestItem_productId_fkey";

-- DropIndex
DROP INDEX "Warehouse_organizationId_idx";

-- AlterTable
ALTER TABLE "InvestorProfile" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryCode" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "maxMembers" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "OrganizationMember" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PosRegister" ADD COLUMN     "activationStatus" "PosActivationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "rejectReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ALTER COLUMN "isActive" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "RegistrationRequest" ALTER COLUMN "requestedOrgType" SET NOT NULL;

-- AlterTable
ALTER TABLE "ServicePost" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StockRequestPayment" ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "paidAmount" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Warehouse" DROP COLUMN "organizationId";

-- AlterTable
ALTER TABLE "WarehouseInventory" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WarehouseStockRequest" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WarehouseStockRequestItem" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "WarehouseSetupToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarehouseSetupToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgJoinRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockDispatch" (
    "id" TEXT NOT NULL,
    "dispatchNumber" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "driverId" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "vehicleNumber" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "note" TEXT,
    "padaanUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchReturn" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "note" TEXT,
    "rejectReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchReturnItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,

    CONSTRAINT "DispatchReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardPaymentAttempt" (
    "id" TEXT NOT NULL,
    "registerId" TEXT,
    "organizationId" TEXT,
    "terminalId" TEXT NOT NULL,
    "bridgeUrl" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "PosPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "initiatedById" TEXT,
    "providerPayload" JSONB,
    "saleReference" TEXT,

    CONSTRAINT "CardPaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QPayInvoice" (
    "id" TEXT NOT NULL,
    "registerId" TEXT,
    "organizationId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "qrText" TEXT NOT NULL,
    "status" "PosQPayStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "webhookPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "initiatedById" TEXT,
    "paymentId" TEXT,
    "saleReference" TEXT,

    CONSTRAINT "QPayInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosSaleIdempotency" (
    "id" TEXT NOT NULL,
    "clientSaleId" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "registerId" TEXT,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosSaleIdempotency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "organizationId" TEXT,
    "type" "PostType" NOT NULL DEFAULT 'GENERAL',
    "content" TEXT NOT NULL,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceZone" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 500,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockInLat" DOUBLE PRECISION NOT NULL,
    "clockInLng" DOUBLE PRECISION NOT NULL,
    "clockInMethod" "AttendanceAuth" NOT NULL,
    "clockOut" TIMESTAMP(3),
    "clockOutLat" DOUBLE PRECISION,
    "clockOutLng" DOUBLE PRECISION,
    "clockOutMethod" "AttendanceAuth",
    "totalMinutes" INTEGER,
    "note" TEXT,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT,
    "status" "ChatSessionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sender" "ChatMessageSender" NOT NULL,
    "senderId" TEXT,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL DEFAULT 'DIRECT',
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" "DmType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosShift" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "registerId" TEXT,
    "cashierId" TEXT NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "openingCash" DECIMAL(18,2) NOT NULL,
    "closingCash" DECIMAL(18,2),
    "expectedCash" DECIMAL(18,2),
    "cashDifference" DECIMAL(18,2),
    "note" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosSale" (
    "id" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "registerId" TEXT,
    "shiftId" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "status" "PosSaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "paymentMethod" TEXT NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "taxTotal" DECIMAL(18,2) NOT NULL,
    "discountTotal" DECIMAL(18,2) NOT NULL,
    "grandTotal" DECIMAL(18,2) NOT NULL,
    "note" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "voidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosSaleLine" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productSku" TEXT,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "taxAmount" DECIMAL(18,2) NOT NULL,
    "discount" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "PosSaleLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseSetupToken_token_key" ON "WarehouseSetupToken"("token");

-- CreateIndex
CREATE INDEX "WarehouseSetupToken_userId_idx" ON "WarehouseSetupToken"("userId");

-- CreateIndex
CREATE INDEX "WarehouseSetupToken_warehouseId_idx" ON "WarehouseSetupToken"("warehouseId");

-- CreateIndex
CREATE INDEX "WarehouseSetupToken_token_idx" ON "WarehouseSetupToken"("token");

-- CreateIndex
CREATE INDEX "WarehouseSetupToken_expiresAt_idx" ON "WarehouseSetupToken"("expiresAt");

-- CreateIndex
CREATE INDEX "OrgJoinRequest_userId_idx" ON "OrgJoinRequest"("userId");

-- CreateIndex
CREATE INDEX "OrgJoinRequest_organizationId_idx" ON "OrgJoinRequest"("organizationId");

-- CreateIndex
CREATE INDEX "OrgJoinRequest_status_idx" ON "OrgJoinRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrgJoinRequest_userId_organizationId_key" ON "OrgJoinRequest"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "StockDispatch_dispatchNumber_key" ON "StockDispatch"("dispatchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StockDispatch_requestId_key" ON "StockDispatch"("requestId");

-- CreateIndex
CREATE INDEX "StockDispatch_warehouseId_idx" ON "StockDispatch"("warehouseId");

-- CreateIndex
CREATE INDEX "StockDispatch_organizationId_idx" ON "StockDispatch"("organizationId");

-- CreateIndex
CREATE INDEX "StockDispatch_status_idx" ON "StockDispatch"("status");

-- CreateIndex
CREATE INDEX "StockDispatch_driverId_idx" ON "StockDispatch"("driverId");

-- CreateIndex
CREATE INDEX "StockDispatch_createdAt_idx" ON "StockDispatch"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchReturn_returnNumber_key" ON "DispatchReturn"("returnNumber");

-- CreateIndex
CREATE INDEX "DispatchReturn_dispatchId_idx" ON "DispatchReturn"("dispatchId");

-- CreateIndex
CREATE INDEX "DispatchReturn_warehouseId_idx" ON "DispatchReturn"("warehouseId");

-- CreateIndex
CREATE INDEX "DispatchReturn_organizationId_idx" ON "DispatchReturn"("organizationId");

-- CreateIndex
CREATE INDEX "DispatchReturn_status_idx" ON "DispatchReturn"("status");

-- CreateIndex
CREATE INDEX "DispatchReturn_createdAt_idx" ON "DispatchReturn"("createdAt");

-- CreateIndex
CREATE INDEX "DispatchReturnItem_returnId_idx" ON "DispatchReturnItem"("returnId");

-- CreateIndex
CREATE INDEX "DispatchReturnItem_productId_idx" ON "DispatchReturnItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchReturnItem_returnId_productId_key" ON "DispatchReturnItem"("returnId", "productId");

-- CreateIndex
CREATE INDEX "CardPaymentAttempt_registerId_idx" ON "CardPaymentAttempt"("registerId");

-- CreateIndex
CREATE INDEX "CardPaymentAttempt_status_idx" ON "CardPaymentAttempt"("status");

-- CreateIndex
CREATE INDEX "CardPaymentAttempt_createdAt_idx" ON "CardPaymentAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "CardPaymentAttempt_initiatedById_idx" ON "CardPaymentAttempt"("initiatedById");

-- CreateIndex
CREATE INDEX "CardPaymentAttempt_saleReference_idx" ON "CardPaymentAttempt"("saleReference");

-- CreateIndex
CREATE UNIQUE INDEX "QPayInvoice_paymentId_key" ON "QPayInvoice"("paymentId");

-- CreateIndex
CREATE INDEX "QPayInvoice_registerId_idx" ON "QPayInvoice"("registerId");

-- CreateIndex
CREATE INDEX "QPayInvoice_status_idx" ON "QPayInvoice"("status");

-- CreateIndex
CREATE INDEX "QPayInvoice_expiresAt_idx" ON "QPayInvoice"("expiresAt");

-- CreateIndex
CREATE INDEX "QPayInvoice_initiatedById_idx" ON "QPayInvoice"("initiatedById");

-- CreateIndex
CREATE INDEX "QPayInvoice_saleReference_idx" ON "QPayInvoice"("saleReference");

-- CreateIndex
CREATE UNIQUE INDEX "PosSaleIdempotency_receiptNo_key" ON "PosSaleIdempotency"("receiptNo");

-- CreateIndex
CREATE INDEX "PosSaleIdempotency_organizationId_idx" ON "PosSaleIdempotency"("organizationId");

-- CreateIndex
CREATE INDEX "PosSaleIdempotency_registerId_idx" ON "PosSaleIdempotency"("registerId");

-- CreateIndex
CREATE INDEX "PosSaleIdempotency_createdAt_idx" ON "PosSaleIdempotency"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PosSaleIdempotency_organizationId_clientSaleId_key" ON "PosSaleIdempotency"("organizationId", "clientSaleId");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_organizationId_idx" ON "Post"("organizationId");

-- CreateIndex
CREATE INDEX "Post_type_idx" ON "Post"("type");

-- CreateIndex
CREATE INDEX "Post_isPinned_idx" ON "Post"("isPinned");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- CreateIndex
CREATE INDEX "PostLike_userId_idx" ON "PostLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PostLike_postId_userId_key" ON "PostLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "PostComment_postId_idx" ON "PostComment"("postId");

-- CreateIndex
CREATE INDEX "PostComment_authorId_idx" ON "PostComment"("authorId");

-- CreateIndex
CREATE INDEX "PostComment_createdAt_idx" ON "PostComment"("createdAt");

-- CreateIndex
CREATE INDEX "AttendanceZone_organizationId_idx" ON "AttendanceZone"("organizationId");

-- CreateIndex
CREATE INDEX "AttendanceZone_branchId_idx" ON "AttendanceZone"("branchId");

-- CreateIndex
CREATE INDEX "AttendanceZone_isActive_idx" ON "AttendanceZone"("isActive");

-- CreateIndex
CREATE INDEX "AttendanceRecord_userId_clockIn_idx" ON "AttendanceRecord"("userId", "clockIn");

-- CreateIndex
CREATE INDEX "AttendanceRecord_organizationId_clockIn_idx" ON "AttendanceRecord"("organizationId", "clockIn");

-- CreateIndex
CREATE INDEX "AttendanceRecord_zoneId_idx" ON "AttendanceRecord"("zoneId");

-- CreateIndex
CREATE INDEX "ChatSession_visitorId_idx" ON "ChatSession"("visitorId");

-- CreateIndex
CREATE INDEX "ChatSession_userId_idx" ON "ChatSession"("userId");

-- CreateIndex
CREATE INDEX "ChatSession_status_updatedAt_idx" ON "ChatSession"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_updatedAt_idx" ON "Conversation"("updatedAt");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "DirectMessage_conversationId_createdAt_idx" ON "DirectMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "DirectMessage_senderId_idx" ON "DirectMessage"("senderId");

-- CreateIndex
CREATE INDEX "PosShift_organizationId_idx" ON "PosShift"("organizationId");

-- CreateIndex
CREATE INDEX "PosShift_branchId_idx" ON "PosShift"("branchId");

-- CreateIndex
CREATE INDEX "PosShift_cashierId_idx" ON "PosShift"("cashierId");

-- CreateIndex
CREATE INDEX "PosShift_status_idx" ON "PosShift"("status");

-- CreateIndex
CREATE INDEX "PosShift_openedAt_idx" ON "PosShift"("openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PosSale_receiptNo_key" ON "PosSale"("receiptNo");

-- CreateIndex
CREATE INDEX "PosSale_organizationId_idx" ON "PosSale"("organizationId");

-- CreateIndex
CREATE INDEX "PosSale_branchId_idx" ON "PosSale"("branchId");

-- CreateIndex
CREATE INDEX "PosSale_shiftId_idx" ON "PosSale"("shiftId");

-- CreateIndex
CREATE INDEX "PosSale_cashierId_idx" ON "PosSale"("cashierId");

-- CreateIndex
CREATE INDEX "PosSale_status_idx" ON "PosSale"("status");

-- CreateIndex
CREATE INDEX "PosSale_createdAt_idx" ON "PosSale"("createdAt");

-- CreateIndex
CREATE INDEX "PosSaleLine_saleId_idx" ON "PosSaleLine"("saleId");

-- CreateIndex
CREATE INDEX "PosSaleLine_productId_idx" ON "PosSaleLine"("productId");

-- CreateIndex
CREATE INDEX "Organization_scheduledPermanentDeletionAt_idx" ON "Organization"("scheduledPermanentDeletionAt");

-- CreateIndex
CREATE INDEX "OrganizationMember_deletedAt_idx" ON "OrganizationMember"("deletedAt");

-- CreateIndex
CREATE INDEX "PosRegister_activationStatus_idx" ON "PosRegister"("activationStatus");

-- CreateIndex
CREATE INDEX "PosRegister_deletedAt_idx" ON "PosRegister"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PosRegister_organizationId_branchId_name_key" ON "PosRegister"("organizationId", "branchId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PosRegister_cardProviderType_cardTerminalId_key" ON "PosRegister"("cardProviderType", "cardTerminalId");

-- CreateIndex
CREATE UNIQUE INDEX "PosRegister_qpayMerchantId_qpayTerminalId_key" ON "PosRegister"("qpayMerchantId", "qpayTerminalId");

-- CreateIndex
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");

-- CreateIndex
CREATE INDEX "RegistrationRequest_inviteToken_idx" ON "RegistrationRequest"("inviteToken");

-- AddForeignKey
ALTER TABLE "WarehouseSetupToken" ADD CONSTRAINT "WarehouseSetupToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseSetupToken" ADD CONSTRAINT "WarehouseSetupToken_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePost" ADD CONSTRAINT "ServicePost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgJoinRequest" ADD CONSTRAINT "OrgJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgJoinRequest" ADD CONSTRAINT "OrgJoinRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosRegister" ADD CONSTRAINT "PosRegister_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseStockRequest" ADD CONSTRAINT "WarehouseStockRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseStockRequest" ADD CONSTRAINT "WarehouseStockRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseStockRequest" ADD CONSTRAINT "WarehouseStockRequest_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseStockRequestItem" ADD CONSTRAINT "WarehouseStockRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockRequestPayment" ADD CONSTRAINT "StockRequestPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDispatch" ADD CONSTRAINT "StockDispatch_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDispatch" ADD CONSTRAINT "StockDispatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDispatch" ADD CONSTRAINT "StockDispatch_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "WarehouseStockRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDispatch" ADD CONSTRAINT "StockDispatch_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchReturn" ADD CONSTRAINT "DispatchReturn_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "StockDispatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchReturn" ADD CONSTRAINT "DispatchReturn_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchReturn" ADD CONSTRAINT "DispatchReturn_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchReturn" ADD CONSTRAINT "DispatchReturn_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchReturnItem" ADD CONSTRAINT "DispatchReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "DispatchReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchReturnItem" ADD CONSTRAINT "DispatchReturnItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardPaymentAttempt" ADD CONSTRAINT "CardPaymentAttempt_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardPaymentAttempt" ADD CONSTRAINT "CardPaymentAttempt_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "PosRegister"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QPayInvoice" ADD CONSTRAINT "QPayInvoice_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QPayInvoice" ADD CONSTRAINT "QPayInvoice_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "PosRegister"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceZone" ADD CONSTRAINT "AttendanceZone_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceZone" ADD CONSTRAINT "AttendanceZone_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "AttendanceZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosShift" ADD CONSTRAINT "PosShift_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosShift" ADD CONSTRAINT "PosShift_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosShift" ADD CONSTRAINT "PosShift_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "PosRegister"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosShift" ADD CONSTRAINT "PosShift_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSale" ADD CONSTRAINT "PosSale_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSale" ADD CONSTRAINT "PosSale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSale" ADD CONSTRAINT "PosSale_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "PosRegister"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSale" ADD CONSTRAINT "PosSale_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "PosShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSale" ADD CONSTRAINT "PosSale_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSaleLine" ADD CONSTRAINT "PosSaleLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "PosSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSaleLine" ADD CONSTRAINT "PosSaleLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
