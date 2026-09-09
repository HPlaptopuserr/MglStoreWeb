-- Apply the building-material retail classification to existing active products
-- that still carry one of the old generic/placeholder classifications. Keep any
-- manually selected specific classification and all historical sale lines intact.
UPDATE "Product" AS product
SET "classificationCode" = '6226100'
FROM "BusinessCategory" AS category
WHERE
  product."businessCategoryId" = category."id"
  AND product."deletedAt" IS NULL
  AND (
    category."slug" IN ('building-materials', '-building-material')
    OR lower(btrim(category."name")) = lower('Барилгын материал')
  )
  AND product."classificationCode" IN ('6212991', '4711000');
