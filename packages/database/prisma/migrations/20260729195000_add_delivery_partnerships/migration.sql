CREATE TYPE "DeliveryPartnershipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

CREATE TABLE "DeliveryPartnership" (
    "id" TEXT NOT NULL,
    "requesterOrganizationId" TEXT,
    "providerOrganizationId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "status" "DeliveryPartnershipStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "rejectionReason" TEXT,
    "requestedById" TEXT NOT NULL,
    "respondedById" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeliveryPartnership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WarehouseCourierAssignment" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "providerOrganizationId" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WarehouseCourierAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeliveryPartnership_requesterOrganizationId_status_idx" ON "DeliveryPartnership"("requesterOrganizationId", "status");
CREATE INDEX "DeliveryPartnership_providerOrganizationId_status_idx" ON "DeliveryPartnership"("providerOrganizationId", "status");
CREATE INDEX "DeliveryPartnership_warehouseId_status_idx" ON "DeliveryPartnership"("warehouseId", "status");
CREATE INDEX "DeliveryPartnership_createdAt_idx" ON "DeliveryPartnership"("createdAt");
CREATE UNIQUE INDEX "WarehouseCourierAssignment_warehouseId_courierId_key" ON "WarehouseCourierAssignment"("warehouseId", "courierId");
CREATE INDEX "WarehouseCourierAssignment_providerOrganizationId_isActive_idx" ON "WarehouseCourierAssignment"("providerOrganizationId", "isActive");
CREATE INDEX "WarehouseCourierAssignment_partnershipId_isActive_idx" ON "WarehouseCourierAssignment"("partnershipId", "isActive");
CREATE INDEX "WarehouseCourierAssignment_courierId_isActive_idx" ON "WarehouseCourierAssignment"("courierId", "isActive");

ALTER TABLE "DeliveryPartnership" ADD CONSTRAINT "DeliveryPartnership_requesterOrganizationId_fkey" FOREIGN KEY ("requesterOrganizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryPartnership" ADD CONSTRAINT "DeliveryPartnership_providerOrganizationId_fkey" FOREIGN KEY ("providerOrganizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryPartnership" ADD CONSTRAINT "DeliveryPartnership_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryPartnership" ADD CONSTRAINT "DeliveryPartnership_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryPartnership" ADD CONSTRAINT "DeliveryPartnership_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WarehouseCourierAssignment" ADD CONSTRAINT "WarehouseCourierAssignment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseCourierAssignment" ADD CONSTRAINT "WarehouseCourierAssignment_providerOrganizationId_fkey" FOREIGN KEY ("providerOrganizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseCourierAssignment" ADD CONSTRAINT "WarehouseCourierAssignment_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "DeliveryPartnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseCourierAssignment" ADD CONSTRAINT "WarehouseCourierAssignment_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseCourierAssignment" ADD CONSTRAINT "WarehouseCourierAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
