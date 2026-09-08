-- Do not silently rewrite tax treatment in a production catalog. VAT_FREE can
-- be a legitimate product-level exemption and requires business confirmation.
-- Fail the deployment before changing data when legacy rows still exist.
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO affected_count
  FROM "Product"
  WHERE
    "deletedAt" IS NULL
    AND "taxType" = 'VAT_FREE';

  IF affected_count > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = format(
        'Migration blocked: %s active VAT_FREE products require tax review before deployment.',
        affected_count
      ),
      HINT = 'Export and review the affected products. Apply an approved, product-specific correction before retrying.';
  END IF;
END $$;
