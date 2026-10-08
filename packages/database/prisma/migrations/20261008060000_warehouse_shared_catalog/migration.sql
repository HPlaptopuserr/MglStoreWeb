-- Explicit catalog ownership is independent of distribution assignments and operators.
ALTER TABLE "Warehouse" ADD COLUMN "catalogOrganizationId" TEXT;
CREATE UNIQUE INDEX "Warehouse_catalogOrganizationId_key" ON "Warehouse"("catalogOrganizationId");
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_catalogOrganizationId_fkey"
  FOREIGN KEY ("catalogOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WAREHOUSE_CATALOG_LINKED';
