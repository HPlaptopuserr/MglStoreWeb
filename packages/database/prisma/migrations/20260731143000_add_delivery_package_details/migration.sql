ALTER TABLE "Delivery"
  ADD COLUMN "packageCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "totalWeightKg" DECIMAL(10,2),
  ADD COLUMN "packageLengthCm" DECIMAL(10,2),
  ADD COLUMN "packageWidthCm" DECIMAL(10,2),
  ADD COLUMN "packageHeightCm" DECIMAL(10,2),
  ADD COLUMN "sizeCategory" TEXT,
  ADD COLUMN "isFragile" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "handlingInstructions" TEXT,
  ADD COLUMN "readyAt" TIMESTAMP(3);
