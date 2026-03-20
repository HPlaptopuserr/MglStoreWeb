-- Migration: add ServicePost, ServicePostImage, missing tables, and Product.businessCategoryId
-- Uses IF NOT EXISTS / EXCEPTION guards for idempotency (safe to run on any DB state)

-- ─── Create missing enums ──────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "InvestorTier" AS ENUM ('INVESTOR', 'STRATEGIC', 'TOP');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StockRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add missing values to InventoryReason enum
ALTER TYPE "InventoryReason" ADD VALUE IF NOT EXISTS 'ORDER_CANCEL';
ALTER TYPE "InventoryReason" ADD VALUE IF NOT EXISTS 'DAMAGE';
ALTER TYPE "InventoryReason" ADD VALUE IF NOT EXISTS 'TRANSFER_IN';
ALTER TYPE "InventoryReason" ADD VALUE IF NOT EXISTS 'TRANSFER_OUT';
ALTER TYPE "InventoryReason" ADD VALUE IF NOT EXISTS 'INITIAL_STOCK';

-- ─── VendorSetupToken ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "VendorSetupToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VendorSetupToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VendorSetupToken_token_key" ON "VendorSetupToken"("token");
CREATE INDEX IF NOT EXISTS "VendorSetupToken_userId_idx" ON "VendorSetupToken"("userId");
CREATE INDEX IF NOT EXISTS "VendorSetupToken_token_idx" ON "VendorSetupToken"("token");
CREATE INDEX IF NOT EXISTS "VendorSetupToken_expiresAt_idx" ON "VendorSetupToken"("expiresAt");

-- ─── InvestorProfile ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "InvestorProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tier" "InvestorTier" NOT NULL DEFAULT 'INVESTOR',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "publiclyVisible" BOOLEAN NOT NULL DEFAULT true,
    "investmentLevel" TEXT,
    "description" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvestorProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InvestorProfile_organizationId_key" ON "InvestorProfile"("organizationId");
CREATE INDEX IF NOT EXISTS "InvestorProfile_tier_idx" ON "InvestorProfile"("tier");
CREATE INDEX IF NOT EXISTS "InvestorProfile_featured_idx" ON "InvestorProfile"("featured");
CREATE INDEX IF NOT EXISTS "InvestorProfile_priority_idx" ON "InvestorProfile"("priority");
CREATE INDEX IF NOT EXISTS "InvestorProfile_publiclyVisible_idx" ON "InvestorProfile"("publiclyVisible");

-- ─── WarehouseOrganization ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "WarehouseOrganization" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT,
    CONSTRAINT "WarehouseOrganization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseOrganization_warehouseId_organizationId_key" ON "WarehouseOrganization"("warehouseId", "organizationId");
CREATE INDEX IF NOT EXISTS "WarehouseOrganization_warehouseId_idx" ON "WarehouseOrganization"("warehouseId");
CREATE INDEX IF NOT EXISTS "WarehouseOrganization_organizationId_idx" ON "WarehouseOrganization"("organizationId");

-- ─── WarehouseInventory ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "WarehouseInventory" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 0,
    "maxQuantity" INTEGER,
    "location" TEXT,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "lastRestockedAt" TIMESTAMP(3),
    "lastAuditedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WarehouseInventory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseInventory_warehouseId_productId_key" ON "WarehouseInventory"("warehouseId", "productId");
CREATE INDEX IF NOT EXISTS "WarehouseInventory_warehouseId_idx" ON "WarehouseInventory"("warehouseId");
CREATE INDEX IF NOT EXISTS "WarehouseInventory_productId_idx" ON "WarehouseInventory"("productId");
CREATE INDEX IF NOT EXISTS "WarehouseInventory_quantity_idx" ON "WarehouseInventory"("quantity");

-- ─── WarehouseStockRequest ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "WarehouseStockRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "StockRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "deliveryAddress" TEXT,
    "deliveryPhone" TEXT,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WarehouseStockRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseStockRequest_requestNumber_key" ON "WarehouseStockRequest"("requestNumber");
CREATE INDEX IF NOT EXISTS "WarehouseStockRequest_organizationId_idx" ON "WarehouseStockRequest"("organizationId");
CREATE INDEX IF NOT EXISTS "WarehouseStockRequest_warehouseId_idx" ON "WarehouseStockRequest"("warehouseId");
CREATE INDEX IF NOT EXISTS "WarehouseStockRequest_status_idx" ON "WarehouseStockRequest"("status");
CREATE INDEX IF NOT EXISTS "WarehouseStockRequest_requestedById_idx" ON "WarehouseStockRequest"("requestedById");
CREATE INDEX IF NOT EXISTS "WarehouseStockRequest_reviewedById_idx" ON "WarehouseStockRequest"("reviewedById");
CREATE INDEX IF NOT EXISTS "WarehouseStockRequest_requestedAt_idx" ON "WarehouseStockRequest"("requestedAt");

-- ─── WarehouseStockRequestItem ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "WarehouseStockRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "approvedQuantity" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WarehouseStockRequestItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseStockRequestItem_requestId_productId_key" ON "WarehouseStockRequestItem"("requestId", "productId");
CREATE INDEX IF NOT EXISTS "WarehouseStockRequestItem_requestId_idx" ON "WarehouseStockRequestItem"("requestId");
CREATE INDEX IF NOT EXISTS "WarehouseStockRequestItem_productId_idx" ON "WarehouseStockRequestItem"("productId");

-- ─── StockRequestPayment ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "StockRequestPayment" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod",
    "paidAt" TIMESTAMP(3),
    "paidBy" TEXT,
    "transactionId" TEXT,
    "note" TEXT,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockRequestPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StockRequestPayment_invoiceNumber_key" ON "StockRequestPayment"("invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "StockRequestPayment_requestId_key" ON "StockRequestPayment"("requestId");
CREATE INDEX IF NOT EXISTS "StockRequestPayment_organizationId_idx" ON "StockRequestPayment"("organizationId");
CREATE INDEX IF NOT EXISTS "StockRequestPayment_status_idx" ON "StockRequestPayment"("status");
CREATE INDEX IF NOT EXISTS "StockRequestPayment_createdAt_idx" ON "StockRequestPayment"("createdAt");

-- ─── ServicePost ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ServicePost" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceText" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ServicePost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ServicePost_organizationId_isActive_idx" ON "ServicePost"("organizationId", "isActive");
CREATE INDEX IF NOT EXISTS "ServicePost_deletedAt_idx" ON "ServicePost"("deletedAt");
CREATE INDEX IF NOT EXISTS "ServicePost_createdAt_idx" ON "ServicePost"("createdAt");

-- ─── ServicePostImage ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ServicePostImage" (
    "id" TEXT NOT NULL,
    "servicePostId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    CONSTRAINT "ServicePostImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ServicePostImage_servicePostId_idx" ON "ServicePostImage"("servicePostId");

-- ─── Add missing columns to existing tables ──────────────────────────────────

-- Warehouse: add city, district, phone (added to schema without migration)
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "city" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "district" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- Organization: add soft-delete tracking fields
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "deletionReason" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "scheduledPermanentDeletionAt" TIMESTAMP(3);

-- Product: add businessCategoryId
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "businessCategoryId" TEXT;
CREATE INDEX IF NOT EXISTS "Product_businessCategoryId_idx" ON "Product"("businessCategoryId");

-- ─── Add missing columns to RegistrationRequest ──────────────────────────────
ALTER TABLE "RegistrationRequest" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "RegistrationRequest" ADD COLUMN IF NOT EXISTS "businessCategory" TEXT;
ALTER TABLE "RegistrationRequest" ADD COLUMN IF NOT EXISTS "operatingYears" INTEGER;
ALTER TABLE "RegistrationRequest" ADD COLUMN IF NOT EXISTS "inviteToken" TEXT;
ALTER TABLE "RegistrationRequest" ADD COLUMN IF NOT EXISTS "inviteTokenExpiresAt" TIMESTAMP(3);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'RegistrationRequest' AND indexname = 'RegistrationRequest_inviteToken_key') THEN
    CREATE UNIQUE INDEX "RegistrationRequest_inviteToken_key" ON "RegistrationRequest"("inviteToken");
  END IF;
END $$;

-- ─── Foreign key constraints (idempotent using EXCEPTION guard) ───────────────

DO $$ BEGIN
  ALTER TABLE "VendorSetupToken" ADD CONSTRAINT "VendorSetupToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InvestorProfile" ADD CONSTRAINT "InvestorProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WarehouseOrganization" ADD CONSTRAINT "WarehouseOrganization_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WarehouseOrganization" ADD CONSTRAINT "WarehouseOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WarehouseOrganization" ADD CONSTRAINT "WarehouseOrganization_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WarehouseInventory" ADD CONSTRAINT "WarehouseInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WarehouseInventory" ADD CONSTRAINT "WarehouseInventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WarehouseStockRequest" ADD CONSTRAINT "WarehouseStockRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WarehouseStockRequest" ADD CONSTRAINT "WarehouseStockRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WarehouseStockRequest" ADD CONSTRAINT "WarehouseStockRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WarehouseStockRequest" ADD CONSTRAINT "WarehouseStockRequest_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WarehouseStockRequestItem" ADD CONSTRAINT "WarehouseStockRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WarehouseStockRequestItem" ADD CONSTRAINT "WarehouseStockRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "WarehouseStockRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StockRequestPayment" ADD CONSTRAINT "StockRequestPayment_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StockRequestPayment" ADD CONSTRAINT "StockRequestPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StockRequestPayment" ADD CONSTRAINT "StockRequestPayment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "WarehouseStockRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ServicePost" ADD CONSTRAINT "ServicePost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ServicePostImage" ADD CONSTRAINT "ServicePostImage_servicePostId_fkey" FOREIGN KEY ("servicePostId") REFERENCES "ServicePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Product" ADD CONSTRAINT "Product_businessCategoryId_fkey" FOREIGN KEY ("businessCategoryId") REFERENCES "BusinessCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
