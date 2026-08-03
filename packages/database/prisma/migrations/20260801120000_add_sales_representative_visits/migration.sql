ALTER TYPE "Capability" ADD VALUE IF NOT EXISTS 'SALES_REPRESENTATIVE';

CREATE TABLE "SalesVisitLocation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 150,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SalesVisitLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesVisitLocationAssignment" (
    "locationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesVisitLocationAssignment_pkey" PRIMARY KEY ("locationId", "memberId")
);

CREATE TABLE "SalesVisit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInLatitude" DOUBLE PRECISION NOT NULL,
    "checkedInLongitude" DOUBLE PRECISION NOT NULL,
    "checkedOutAt" TIMESTAMP(3),
    "checkedOutLatitude" DOUBLE PRECISION,
    "checkedOutLongitude" DOUBLE PRECISION,
    "durationMinutes" INTEGER,
    "note" TEXT,
    "promotedProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SalesVisit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SalesVisitLocation_organizationId_isActive_idx" ON "SalesVisitLocation"("organizationId", "isActive");
CREATE INDEX "SalesVisitLocationAssignment_memberId_idx" ON "SalesVisitLocationAssignment"("memberId");
CREATE INDEX "SalesVisit_organizationId_checkedInAt_idx" ON "SalesVisit"("organizationId", "checkedInAt");
CREATE INDEX "SalesVisit_locationId_checkedInAt_idx" ON "SalesVisit"("locationId", "checkedInAt");
CREATE INDEX "SalesVisit_userId_checkedInAt_idx" ON "SalesVisit"("userId", "checkedInAt");

ALTER TABLE "SalesVisitLocation" ADD CONSTRAINT "SalesVisitLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesVisitLocationAssignment" ADD CONSTRAINT "SalesVisitLocationAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "SalesVisitLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesVisitLocationAssignment" ADD CONSTRAINT "SalesVisitLocationAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "OrganizationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesVisit" ADD CONSTRAINT "SalesVisit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesVisit" ADD CONSTRAINT "SalesVisit_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "SalesVisitLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesVisit" ADD CONSTRAINT "SalesVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
