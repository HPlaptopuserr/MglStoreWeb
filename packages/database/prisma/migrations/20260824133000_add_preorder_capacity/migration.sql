ALTER TABLE "Product"
  ADD COLUMN "preorderCapacity" INTEGER;

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_preorderCapacity_positive"
  CHECK ("preorderCapacity" IS NULL OR "preorderCapacity" > 0);
