ALTER TABLE "ProductImage"
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- ProductImage previously had no ordering column. PostgreSQL normally keeps
-- rows from each nested create together, so preserve that existing physical
-- order once while making all future ordering explicit.
WITH ranked_images AS (
  SELECT
    "id",
    (
      ROW_NUMBER() OVER (
        PARTITION BY "productId"
        ORDER BY ctid
      ) - 1
    )::INTEGER AS "sortOrder"
  FROM "ProductImage"
)
UPDATE "ProductImage" AS image
SET "sortOrder" = ranked_images."sortOrder"
FROM ranked_images
WHERE image."id" = ranked_images."id";

CREATE INDEX "ProductImage_productId_sortOrder_idx"
ON "ProductImage"("productId", "sortOrder");
