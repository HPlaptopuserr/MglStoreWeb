ALTER TABLE "Product"
ADD COLUMN "preorderPriceCurrency" VARCHAR(3),
ADD COLUMN "preorderPriceAmount" DECIMAL(18,4),
ADD COLUMN "preorderExchangeRate" DECIMAL(18,6),
ADD COLUMN "preorderMarkupPercent" DECIMAL(5,2),
ADD COLUMN "preorderRateSource" TEXT,
ADD COLUMN "preorderRateFetchedAt" TIMESTAMP(3);

UPDATE "Product"
SET
  "preorderPriceCurrency" = 'MNT',
  "preorderPriceAmount" = "price",
  "preorderExchangeRate" = 1,
  "preorderMarkupPercent" = 0,
  "preorderRateSource" = 'LEGACY_MNT',
  "preorderRateFetchedAt" = COALESCE("updatedAt", NOW())
WHERE "supplyType" = 'CHINA_PREORDER';
