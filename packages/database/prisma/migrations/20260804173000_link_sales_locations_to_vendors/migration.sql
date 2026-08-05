ALTER TABLE "SalesVisitLocation"
ADD COLUMN "vendorOrganizationId" TEXT;

ALTER TABLE "Organization"
ADD COLUMN "salesRepVendorRestrictionEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TYPE "AuditAction" ADD VALUE 'SALES_REP_VENDOR_LOOKUP';
ALTER TYPE "AuditAction" ADD VALUE 'SALES_REP_VENDOR_ORDER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SALES_REP_VENDOR_PAYMENT_OPENED';

CREATE UNIQUE INDEX "SalesVisitLocation_vendorOrganizationId_key"
ON "SalesVisitLocation"("vendorOrganizationId");

CREATE INDEX "SalesVisitLocation_vendorOrganizationId_idx"
ON "SalesVisitLocation"("vendorOrganizationId");

ALTER TABLE "SalesVisitLocation"
ADD CONSTRAINT "SalesVisitLocation_vendorOrganizationId_fkey"
FOREIGN KEY ("vendorOrganizationId") REFERENCES "Organization"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
