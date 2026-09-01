ALTER TABLE "Product"
  ALTER COLUMN "classificationCode" SET DEFAULT '6212991';

ALTER TABLE "PosSaleLine"
  ALTER COLUMN "classificationCode" SET DEFAULT '6212991';

-- 4711000 is "Цахилгааны конденсатор" and was previously used as a
-- placeholder for every product. Replace only that placeholder value.
UPDATE "Product"
SET "classificationCode" = '6212991'
WHERE "classificationCode" = '4711000';

-- The old product form suggested seven-digit classification values in the
-- three-digit taxProductCode field. Recover that classification before clearing
-- the stale merchant-VAT choice. Valid official three-digit VAT_FREE/VAT_ZERO
-- settings are intentionally preserved.
UPDATE "Product"
SET "classificationCode" = "taxProductCode"
WHERE "taxProductCode" ~ '^[0-9]{7}$';

UPDATE "Product"
SET
  "taxType" = CASE
    WHEN "taxType" IN ('VAT_FREE', 'VAT_ZERO', 'NOT_VAT') THEN 'VAT_ABLE'
    ELSE "taxType"
  END,
  "taxProductCode" = NULL
WHERE "taxProductCode" ~ '^[0-9]{7}$';
