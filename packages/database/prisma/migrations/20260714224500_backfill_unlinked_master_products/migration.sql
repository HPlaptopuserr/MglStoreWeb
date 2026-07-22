INSERT INTO "MasterProduct" (
  "id", "canonicalName", "normalizedName", "barcode", "unit",
  "description", "imageUrl", "categoryName", "sourceProductId", "updatedAt"
)
SELECT
  MD5('legacy-product:' || p."id")::uuid::text,
  p."name",
  LOWER(REGEXP_REPLACE(TRIM(p."name"), '[^[:alnum:]]+', ' ', 'g')),
  NULL,
  p."unit",
  p."description",
  (SELECT pi."url" FROM "ProductImage" pi WHERE pi."productId" = p."id" ORDER BY pi."id" LIMIT 1),
  COALESCE(bc."name", c."name"),
  p."id",
  CURRENT_TIMESTAMP
FROM "Product" p
LEFT JOIN "BusinessCategory" bc ON bc."id" = p."businessCategoryId"
LEFT JOIN "Category" c ON c."id" = p."categoryId"
WHERE p."deletedAt" IS NULL AND p."masterProductId" IS NULL;

UPDATE "Product" p
SET "masterProductId" = MD5('legacy-product:' || p."id")::uuid::text
WHERE p."deletedAt" IS NULL AND p."masterProductId" IS NULL;

INSERT INTO "MasterProductAlias" (
  "id", "masterProductId", "value", "normalizedValue"
)
SELECT
  MD5('legacy-alias:' || p."id")::uuid::text,
  p."masterProductId",
  p."name",
  LOWER(REGEXP_REPLACE(TRIM(p."name"), '[^[:alnum:]]+', ' ', 'g'))
FROM "Product" p
WHERE p."deletedAt" IS NULL AND p."masterProductId" IS NOT NULL
ON CONFLICT ("masterProductId", "normalizedValue") DO NOTHING;
