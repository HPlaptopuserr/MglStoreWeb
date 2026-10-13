CREATE TYPE "RestaurantMealContractStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE "RestaurantMealChargeStatus" AS ENUM ('ACTIVE', 'VOIDED');

CREATE TABLE "RestaurantMealContract" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerOrganization" TEXT NOT NULL,
    "customerRegisterNo" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "RestaurantMealContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantMealContract_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RestaurantMealContract_date_range_check" CHECK ("endDate" >= "startDate")
);

CREATE TABLE "RestaurantMealContractMember" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "department" TEXT,
    "accessToken" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "dailyLimit" DECIMAL(18,2),
    "monthlyLimit" DECIMAL(18,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantMealContractMember_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RestaurantMealContractMember_daily_limit_check" CHECK ("dailyLimit" IS NULL OR "dailyLimit" > 0),
    CONSTRAINT "RestaurantMealContractMember_monthly_limit_check" CHECK ("monthlyLimit" IS NULL OR "monthlyLimit" > 0)
);

CREATE TABLE "RestaurantMealCharge" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "restaurantTicketId" TEXT NOT NULL,
    "clientRequestId" TEXT,
    "companyNameSnapshot" TEXT NOT NULL,
    "employeeCodeSnapshot" TEXT NOT NULL,
    "employeeNameSnapshot" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "packagingFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "RestaurantMealChargeStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantMealCharge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RestaurantMealCharge_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "RestaurantMealCharge_packaging_fee_check" CHECK ("packagingFee" >= 0)
);

CREATE INDEX "RestaurantMealContract_organizationId_status_startDate_endDate_idx" ON "RestaurantMealContract"("organizationId", "status", "startDate", "endDate");
CREATE INDEX "RestaurantMealContract_customerOrganization_idx" ON "RestaurantMealContract"("customerOrganization");
CREATE INDEX "RestaurantMealContract_customerRegisterNo_idx" ON "RestaurantMealContract"("customerRegisterNo");
CREATE INDEX "RestaurantMealContract_createdById_idx" ON "RestaurantMealContract"("createdById");

CREATE UNIQUE INDEX "RestaurantMealContractMember_accessToken_key" ON "RestaurantMealContractMember"("accessToken");
CREATE UNIQUE INDEX "RestaurantMealContractMember_contractId_employeeCode_key" ON "RestaurantMealContractMember"("contractId", "employeeCode");
CREATE INDEX "RestaurantMealContractMember_contractId_isActive_idx" ON "RestaurantMealContractMember"("contractId", "isActive");
CREATE INDEX "RestaurantMealContractMember_fullName_idx" ON "RestaurantMealContractMember"("fullName");

CREATE UNIQUE INDEX "RestaurantMealCharge_restaurantTicketId_key" ON "RestaurantMealCharge"("restaurantTicketId");
CREATE UNIQUE INDEX "RestaurantMealCharge_clientRequestId_key" ON "RestaurantMealCharge"("clientRequestId");
CREATE INDEX "RestaurantMealCharge_organizationId_orderedAt_idx" ON "RestaurantMealCharge"("organizationId", "orderedAt");
CREATE INDEX "RestaurantMealCharge_contractId_orderedAt_idx" ON "RestaurantMealCharge"("contractId", "orderedAt");
CREATE INDEX "RestaurantMealCharge_memberId_orderedAt_idx" ON "RestaurantMealCharge"("memberId", "orderedAt");
CREATE INDEX "RestaurantMealCharge_branchId_orderedAt_idx" ON "RestaurantMealCharge"("branchId", "orderedAt");
CREATE INDEX "RestaurantMealCharge_shiftId_idx" ON "RestaurantMealCharge"("shiftId");
CREATE INDEX "RestaurantMealCharge_cashierId_idx" ON "RestaurantMealCharge"("cashierId");
CREATE INDEX "RestaurantMealCharge_status_orderedAt_idx" ON "RestaurantMealCharge"("status", "orderedAt");

ALTER TABLE "RestaurantMealContract"
ADD CONSTRAINT "RestaurantMealContract_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RestaurantMealContract"
ADD CONSTRAINT "RestaurantMealContract_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RestaurantMealContractMember"
ADD CONSTRAINT "RestaurantMealContractMember_contractId_fkey"
FOREIGN KEY ("contractId") REFERENCES "RestaurantMealContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RestaurantMealCharge"
ADD CONSTRAINT "RestaurantMealCharge_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RestaurantMealCharge"
ADD CONSTRAINT "RestaurantMealCharge_contractId_fkey"
FOREIGN KEY ("contractId") REFERENCES "RestaurantMealContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RestaurantMealCharge"
ADD CONSTRAINT "RestaurantMealCharge_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "RestaurantMealContractMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RestaurantMealCharge"
ADD CONSTRAINT "RestaurantMealCharge_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RestaurantMealCharge"
ADD CONSTRAINT "RestaurantMealCharge_shiftId_fkey"
FOREIGN KEY ("shiftId") REFERENCES "PosShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RestaurantMealCharge"
ADD CONSTRAINT "RestaurantMealCharge_cashierId_fkey"
FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RestaurantMealCharge"
ADD CONSTRAINT "RestaurantMealCharge_restaurantTicketId_fkey"
FOREIGN KEY ("restaurantTicketId") REFERENCES "RestaurantTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
