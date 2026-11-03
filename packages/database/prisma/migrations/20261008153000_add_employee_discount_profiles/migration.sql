CREATE TYPE "PosDiscountProfileType" AS ENUM ('REGULAR_CUSTOMER', 'EMPLOYEE');

ALTER TABLE "CafeRegularCustomer"
ADD COLUMN "profileType" "PosDiscountProfileType" NOT NULL DEFAULT 'REGULAR_CUSTOMER';

DROP INDEX "CafeRegularCustomer_organizationId_normalizedPhone_key";
DROP INDEX "CafeRegularCustomer_organizationId_isActive_idx";

CREATE UNIQUE INDEX "CafeRegularCustomer_organizationId_normalizedPhone_profileType_key"
ON "CafeRegularCustomer"("organizationId", "normalizedPhone", "profileType");

CREATE INDEX "CafeRegularCustomer_organizationId_profileType_isActive_idx"
ON "CafeRegularCustomer"("organizationId", "profileType", "isActive");
