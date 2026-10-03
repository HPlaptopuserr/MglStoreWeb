ALTER TABLE "Product"
ADD COLUMN "lowStockThreshold" DECIMAL(18, 3) NOT NULL DEFAULT 5;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_lowStockThreshold_nonnegative"
CHECK ("lowStockThreshold" >= 0);
