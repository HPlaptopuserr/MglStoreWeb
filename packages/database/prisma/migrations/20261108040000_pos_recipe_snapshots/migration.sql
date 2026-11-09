CREATE TABLE "PosSaleRecipeSnapshot" (
  "saleLineId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "recipeVersion" INTEGER NOT NULL,
  "recipe" JSONB NOT NULL,
  "servings" DECIMAL(18,3) NOT NULL,
  CONSTRAINT "PosSaleRecipeSnapshot_pkey" PRIMARY KEY ("saleLineId"),
  CONSTRAINT "PosSaleRecipeSnapshot_positive_check" CHECK ("servings" > 0 AND "recipeVersion" > 0)
);
ALTER TABLE "PosSaleRecipeSnapshot" ADD CONSTRAINT "PosSaleRecipeSnapshot_saleLineId_fkey"
  FOREIGN KEY ("saleLineId") REFERENCES "PosSaleLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "PosSaleRecipeSnapshot_productId_recipeVersion_idx" ON "PosSaleRecipeSnapshot"("productId", "recipeVersion");
