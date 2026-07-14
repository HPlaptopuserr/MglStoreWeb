CREATE TABLE "MasterProduct" (
  "id" TEXT NOT NULL,
  "canonicalName" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "barcode" TEXT,
  "brand" TEXT,
  "unit" TEXT,
  "description" TEXT,
  "imageUrl" TEXT,
  "categoryName" TEXT,
  "sourceProductId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MasterProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MasterProductAlias" (
  "id" TEXT NOT NULL,
  "masterProductId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "normalizedValue" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MasterProductAlias_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Product" ADD COLUMN "masterProductId" TEXT;

CREATE UNIQUE INDEX "MasterProduct_barcode_key" ON "MasterProduct"("barcode");
CREATE INDEX "MasterProduct_normalizedName_idx" ON "MasterProduct"("normalizedName");
CREATE INDEX "MasterProduct_status_idx" ON "MasterProduct"("status");
CREATE UNIQUE INDEX "MasterProductAlias_masterProductId_normalizedValue_key"
  ON "MasterProductAlias"("masterProductId", "normalizedValue");
CREATE INDEX "MasterProductAlias_normalizedValue_idx" ON "MasterProductAlias"("normalizedValue");
CREATE INDEX "Product_masterProductId_idx" ON "Product"("masterProductId");

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_masterProductId_fkey"
  FOREIGN KEY ("masterProductId") REFERENCES "MasterProduct"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MasterProductAlias"
  ADD CONSTRAINT "MasterProductAlias_masterProductId_fkey"
  FOREIGN KEY ("masterProductId") REFERENCES "MasterProduct"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing products are linked without merging uncertain name-only matches.
-- Exact normalized barcodes are safe to share across organizations.
INSERT INTO "MasterProduct" (
  "id", "canonicalName", "normalizedName", "barcode", "unit",
  "description", "imageUrl", "categoryName", "sourceProductId", "updatedAt"
)
SELECT DISTINCT ON (LOWER(TRIM(p."barcode")))
  MD5('barcode:' || LOWER(TRIM(p."barcode")))::uuid::text,
  p."name",
  LOWER(REGEXP_REPLACE(TRIM(p."name"), '[^[:alnum:]]+', ' ', 'g')),
  LOWER(TRIM(p."barcode")),
  p."unit",
  p."description",
  (SELECT pi."url" FROM "ProductImage" pi WHERE pi."productId" = p."id" ORDER BY pi."id" LIMIT 1),
  COALESCE(bc."name", c."name"),
  p."id",
  CURRENT_TIMESTAMP
FROM "Product" p
LEFT JOIN "BusinessCategory" bc ON bc."id" = p."businessCategoryId"
LEFT JOIN "Category" c ON c."id" = p."categoryId"
WHERE p."deletedAt" IS NULL AND NULLIF(TRIM(p."barcode"), '') IS NOT NULL
ORDER BY LOWER(TRIM(p."barcode")), p."createdAt";

UPDATE "Product" p
SET "masterProductId" = mp."id"
FROM "MasterProduct" mp
WHERE NULLIF(TRIM(p."barcode"), '') IS NOT NULL
  AND LOWER(TRIM(p."barcode")) = mp."barcode";
