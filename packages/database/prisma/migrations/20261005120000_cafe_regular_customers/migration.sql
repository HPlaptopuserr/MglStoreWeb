CREATE TABLE "CafeRegularCustomer" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "normalizedPhone" TEXT NOT NULL,
  "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastUsedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CafeRegularCustomer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CafeRegularCustomer_discountPercent_check"
    CHECK ("discountPercent" >= 0 AND "discountPercent" <= 100)
);

ALTER TABLE "CafeRegularCustomer"
ADD CONSTRAINT "CafeRegularCustomer_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "CafeRegularCustomer_organizationId_normalizedPhone_key"
ON "CafeRegularCustomer"("organizationId", "normalizedPhone");

CREATE INDEX "CafeRegularCustomer_organizationId_isActive_idx"
ON "CafeRegularCustomer"("organizationId", "isActive");

CREATE INDEX "CafeRegularCustomer_name_idx"
ON "CafeRegularCustomer"("name");

ALTER TABLE "PosSale" ADD COLUMN "cafeRegularCustomerId" TEXT;

ALTER TABLE "PosSale"
ADD CONSTRAINT "PosSale_cafeRegularCustomerId_fkey"
FOREIGN KEY ("cafeRegularCustomerId") REFERENCES "CafeRegularCustomer"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PosSale_cafeRegularCustomerId_idx"
ON "PosSale"("cafeRegularCustomerId");
