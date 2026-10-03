ALTER TABLE "Product"
ADD COLUMN "takeawayPackagingFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "isSoldByPiece" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pieceSmallPackSize" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "pieceSmallPackFee" DECIMAL(18,2) NOT NULL DEFAULT 300,
ADD COLUMN "pieceLargePackSize" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN "pieceLargePackFee" DECIMAL(18,2) NOT NULL DEFAULT 800;

-- Preserve the existing restaurant behaviour while keeping cafe packaging free.
UPDATE "Product" AS product
SET "takeawayPackagingFee" = 800
WHERE product."isRestaurantMenuItem" = true
  AND product."isTakeawayAvailable" = true
  AND NOT EXISTS (
    SELECT 1
    FROM "SiteSetting" AS setting
    WHERE setting."key" = 'self-service-mode-' || product."organizationId"
      AND UPPER(TRIM(setting."value")) = 'CAFE'
  );
