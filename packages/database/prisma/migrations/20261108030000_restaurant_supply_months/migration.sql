CREATE TABLE "RestaurantSupplyMonth" (
  "organizationId" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestaurantSupplyMonth_pkey" PRIMARY KEY ("organizationId", "month"),
  CONSTRAINT "RestaurantSupplyMonth_month_check" CHECK ("month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT "RestaurantSupplyMonth_version_check" CHECK ("version" > 0)
);
ALTER TABLE "RestaurantSupplyMonth" ADD CONSTRAINT "RestaurantSupplyMonth_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
