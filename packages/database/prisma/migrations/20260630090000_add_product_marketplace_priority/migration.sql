ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "marketplacePriority" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Product_marketplacePriority_idx"
ON "Product"("marketplacePriority");
