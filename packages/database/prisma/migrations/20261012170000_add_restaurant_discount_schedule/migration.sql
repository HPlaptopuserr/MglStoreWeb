-- CreateTable
CREATE TABLE "RestaurantDiscountSchedule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "percent" INTEGER NOT NULL DEFAULT 20,
    "startMinute" INTEGER NOT NULL DEFAULT 540,
    "endMinute" INTEGER NOT NULL DEFAULT 1020,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Ulaanbaatar',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantDiscountSchedule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RestaurantDiscountSchedule_percent_check" CHECK ("percent" BETWEEN 1 AND 99),
    CONSTRAINT "RestaurantDiscountSchedule_startMinute_check" CHECK ("startMinute" BETWEEN 0 AND 1439),
    CONSTRAINT "RestaurantDiscountSchedule_endMinute_check" CHECK ("endMinute" BETWEEN 0 AND 1439),
    CONSTRAINT "RestaurantDiscountSchedule_window_check" CHECK ("startMinute" <> "endMinute")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantDiscountSchedule_organizationId_key" ON "RestaurantDiscountSchedule"("organizationId");

-- CreateIndex
CREATE INDEX "RestaurantDiscountSchedule_organizationId_isEnabled_idx" ON "RestaurantDiscountSchedule"("organizationId", "isEnabled");

-- AddForeignKey
ALTER TABLE "RestaurantDiscountSchedule" ADD CONSTRAINT "RestaurantDiscountSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
