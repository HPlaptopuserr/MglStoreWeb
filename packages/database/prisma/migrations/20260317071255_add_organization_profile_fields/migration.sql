-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "customerCount" TEXT DEFAULT '0',
ADD COLUMN     "deliveryPrice" TEXT,
ADD COLUMN     "deliveryText" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "openingHours" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "operatingYears" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shortDescription" TEXT;
