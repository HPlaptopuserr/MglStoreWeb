-- This deployment serves grocery stores. Older product forms used VAT_FREE to
-- represent a non-VAT merchant, but merchant VAT status is not a product tax
-- exemption. Normalize all remaining non-deleted catalog rows to ordinary sales.
-- Historical PosSaleLine rows and already issued receipts remain unchanged.
UPDATE "Product"
SET
  "taxType" = 'VAT_ABLE',
  "taxProductCode" = NULL
WHERE
  "deletedAt" IS NULL
  AND "taxType" = 'VAT_FREE';
