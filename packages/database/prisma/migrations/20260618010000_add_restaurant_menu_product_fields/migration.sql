ALTER TABLE "Product"
ADD COLUMN "isRestaurantMenuItem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "menuCategory" TEXT,
ADD COLUMN "kitchenStation" TEXT,
ADD COLUMN "preparationMinutes" INTEGER;

CREATE INDEX "Product_organizationId_isRestaurantMenuItem_isActive_idx"
ON "Product"("organizationId", "isRestaurantMenuItem", "isActive");
