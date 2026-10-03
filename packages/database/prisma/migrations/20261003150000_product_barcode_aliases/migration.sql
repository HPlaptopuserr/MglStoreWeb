ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "barcodeAliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX IF NOT EXISTS "Product_barcodeAliases_idx" ON "Product" USING GIN ("barcodeAliases");
