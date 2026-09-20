CREATE TABLE "RestaurantMenuCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantMenuCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RestaurantMenuCategory_organizationId_code_key"
ON "RestaurantMenuCategory"("organizationId", "code");

CREATE INDEX "RestaurantMenuCategory_organizationId_sortOrder_idx"
ON "RestaurantMenuCategory"("organizationId", "sortOrder");

ALTER TABLE "RestaurantMenuCategory"
ADD CONSTRAINT "RestaurantMenuCategory_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
