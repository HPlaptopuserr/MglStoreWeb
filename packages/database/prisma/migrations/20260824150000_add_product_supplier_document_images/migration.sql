CREATE TABLE "ProductSupplierDocument" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "frontImageUrl" TEXT NOT NULL,
  "backImageUrl" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductSupplierDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductSupplierDocument_productId_key"
  ON "ProductSupplierDocument"("productId");

ALTER TABLE "ProductSupplierDocument"
  ADD CONSTRAINT "ProductSupplierDocument_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
