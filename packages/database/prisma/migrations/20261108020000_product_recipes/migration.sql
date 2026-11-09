-- Recipes are private management data; public product payloads do not include them.
CREATE TABLE "ProductRecipe" (
    "productId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductRecipe_pkey" PRIMARY KEY ("productId"),
    CONSTRAINT "ProductRecipe_version_check" CHECK ("version" > 0)
);
ALTER TABLE "ProductRecipe" ADD CONSTRAINT "ProductRecipe_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
