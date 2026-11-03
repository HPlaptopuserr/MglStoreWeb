-- CreateEnum
CREATE TYPE "BuildingProjectStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'SOLD_OUT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BuildingConstructionStatus" AS ENUM ('PLANNED', 'UNDER_CONSTRUCTION', 'COMPLETED', 'HANDED_OVER');

-- CreateEnum
CREATE TYPE "BuildingVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BuildingUnitStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'CONTRACT_PENDING', 'SOLD', 'HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BuildingReservationStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "BarilgaPaymentKind" AS ENUM ('DOWN_PAYMENT', 'MONTHLY', 'FULL_PAYMENT');

-- CreateEnum
CREATE TYPE "BarilgaPaymentProvider" AS ENUM ('MINU_POS');

-- CreateEnum
CREATE TYPE "BarilgaPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BarilgaScheduleStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "BarilgaProject" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "district" TEXT,
    "khoroo" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "totalAreaM2" DECIMAL(12,2),
    "constructionStatus" "BuildingConstructionStatus" NOT NULL DEFAULT 'PLANNED',
    "status" "BuildingProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "verification" "BuildingVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "coverImageUrl" TEXT,
    "planImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documents" JSONB,
    "startsAt" TIMESTAMP(3),
    "completesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BarilgaProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarilgaBlock" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "minPaymentPercent" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "maxPaymentPercent" DECIMAL(5,2) NOT NULL DEFAULT 70,

    CONSTRAINT "BarilgaBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarilgaPaymentTier" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "minPercent" DECIMAL(5,2) NOT NULL,
    "maxPercent" DECIMAL(5,2) NOT NULL,
    "pricePerM2" DECIMAL(18,2) NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarilgaPaymentTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarilgaFloor" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,

    CONSTRAINT "BarilgaFloor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarilgaUnit" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "unitNo" TEXT NOT NULL,
    "typeLabel" TEXT,
    "rooms" INTEGER,
    "areaM2" DECIMAL(10,2),
    "priceTotal" DECIMAL(18,2),
    "pricePerM2" DECIMAL(18,2),
    "planImageUrl" TEXT,
    "status" "BuildingUnitStatus" NOT NULL DEFAULT 'AVAILABLE',
    "lockVersion" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarilgaUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarilgaReservation" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "reservedById" TEXT NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "reminderPhones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "paymentOption" TEXT NOT NULL DEFAULT 'PERCENT_RANGE',
    "downPaymentPercent" DECIMAL(5,2),
    "agreedPricePerM2" DECIMAL(18,2),
    "agreedPriceTotal" DECIMAL(18,2),
    "status" "BuildingReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarilgaReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarilgaPayment" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "kind" "BarilgaPaymentKind" NOT NULL DEFAULT 'DOWN_PAYMENT',
    "provider" "BarilgaPaymentProvider" NOT NULL DEFAULT 'MINU_POS',
    "status" "BarilgaPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(18,2) NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "qrText" TEXT,
    "qrImage" TEXT,
    "deepLinks" JSONB,
    "providerRef" TEXT,
    "rawPayload" JSONB,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarilgaPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarilgaPaymentSchedule" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "BarilgaScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarilgaPaymentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BarilgaProject_slug_key" ON "BarilgaProject"("slug");

-- CreateIndex
CREATE INDEX "BarilgaProject_organizationId_idx" ON "BarilgaProject"("organizationId");

-- CreateIndex
CREATE INDEX "BarilgaProject_status_idx" ON "BarilgaProject"("status");

-- CreateIndex
CREATE INDEX "BarilgaProject_constructionStatus_idx" ON "BarilgaProject"("constructionStatus");

-- CreateIndex
CREATE INDEX "BarilgaProject_verification_idx" ON "BarilgaProject"("verification");

-- CreateIndex
CREATE INDEX "BarilgaProject_district_idx" ON "BarilgaProject"("district");

-- CreateIndex
CREATE INDEX "BarilgaProject_khoroo_idx" ON "BarilgaProject"("khoroo");

-- CreateIndex
CREATE INDEX "BarilgaBlock_projectId_idx" ON "BarilgaBlock"("projectId");

-- CreateIndex
CREATE INDEX "BarilgaPaymentTier_blockId_idx" ON "BarilgaPaymentTier"("blockId");

-- CreateIndex
CREATE INDEX "BarilgaFloor_blockId_idx" ON "BarilgaFloor"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "BarilgaFloor_blockId_number_key" ON "BarilgaFloor"("blockId", "number");

-- CreateIndex
CREATE INDEX "BarilgaUnit_status_idx" ON "BarilgaUnit"("status");

-- CreateIndex
CREATE INDEX "BarilgaUnit_published_idx" ON "BarilgaUnit"("published");

-- CreateIndex
CREATE UNIQUE INDEX "BarilgaUnit_floorId_unitNo_key" ON "BarilgaUnit"("floorId", "unitNo");

-- CreateIndex
CREATE INDEX "BarilgaReservation_unitId_idx" ON "BarilgaReservation"("unitId");

-- CreateIndex
CREATE INDEX "BarilgaReservation_reservedById_idx" ON "BarilgaReservation"("reservedById");

-- CreateIndex
CREATE INDEX "BarilgaReservation_status_idx" ON "BarilgaReservation"("status");

-- CreateIndex
CREATE INDEX "BarilgaReservation_expiresAt_idx" ON "BarilgaReservation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BarilgaPayment_invoiceNumber_key" ON "BarilgaPayment"("invoiceNumber");

-- CreateIndex
CREATE INDEX "BarilgaPayment_reservationId_idx" ON "BarilgaPayment"("reservationId");

-- CreateIndex
CREATE INDEX "BarilgaPayment_status_idx" ON "BarilgaPayment"("status");

-- CreateIndex
CREATE INDEX "BarilgaPayment_provider_idx" ON "BarilgaPayment"("provider");

-- CreateIndex
CREATE INDEX "BarilgaPaymentSchedule_reservationId_idx" ON "BarilgaPaymentSchedule"("reservationId");

-- CreateIndex
CREATE INDEX "BarilgaPaymentSchedule_dueDate_idx" ON "BarilgaPaymentSchedule"("dueDate");

-- CreateIndex
CREATE INDEX "BarilgaPaymentSchedule_status_idx" ON "BarilgaPaymentSchedule"("status");

-- AddForeignKey
ALTER TABLE "BarilgaProject" ADD CONSTRAINT "BarilgaProject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarilgaBlock" ADD CONSTRAINT "BarilgaBlock_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BarilgaProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarilgaPaymentTier" ADD CONSTRAINT "BarilgaPaymentTier_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "BarilgaBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarilgaFloor" ADD CONSTRAINT "BarilgaFloor_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "BarilgaBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarilgaUnit" ADD CONSTRAINT "BarilgaUnit_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "BarilgaFloor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarilgaReservation" ADD CONSTRAINT "BarilgaReservation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BarilgaUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarilgaReservation" ADD CONSTRAINT "BarilgaReservation_reservedById_fkey" FOREIGN KEY ("reservedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarilgaPayment" ADD CONSTRAINT "BarilgaPayment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "BarilgaReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarilgaPaymentSchedule" ADD CONSTRAINT "BarilgaPaymentSchedule_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "BarilgaReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

