ALTER TABLE "Organization"
  ADD COLUMN "soldCount" INTEGER NOT NULL DEFAULT 0,
  ALTER COLUMN "rating" SET DEFAULT 0;

UPDATE "Organization"
SET "rating" = 0
WHERE "reviewCount" = 0;

ALTER TABLE "Product"
  ADD COLUMN "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "soldCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ProductReview" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductReview_score_check" CHECK ("score" BETWEEN 1 AND 10)
);

CREATE UNIQUE INDEX "ProductReview_orderItemId_key" ON "ProductReview"("orderItemId");
CREATE INDEX "ProductReview_productId_createdAt_idx" ON "ProductReview"("productId", "createdAt");
CREATE INDEX "ProductReview_organizationId_createdAt_idx" ON "ProductReview"("organizationId", "createdAt");
CREATE INDEX "ProductReview_customerId_createdAt_idx" ON "ProductReview"("customerId", "createdAt");
CREATE INDEX "ProductReview_orderId_idx" ON "ProductReview"("orderId");
CREATE INDEX "ProductReview_score_idx" ON "ProductReview"("score");

ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "Product" AS product
SET "soldCount" = sales.quantity
FROM (
  SELECT item."productId", COALESCE(SUM(item."quantity"), 0)::INTEGER AS quantity
  FROM "OrderItem" AS item
  INNER JOIN "Order" AS customer_order ON customer_order."id" = item."orderId"
  WHERE customer_order."status" = 'COMPLETED' AND customer_order."deletedAt" IS NULL
  GROUP BY item."productId"
) AS sales
WHERE product."id" = sales."productId";

UPDATE "Organization" AS organization
SET "soldCount" = sales.quantity
FROM (
  SELECT customer_order."organizationId", COALESCE(SUM(item."quantity"), 0)::INTEGER AS quantity
  FROM "OrderItem" AS item
  INNER JOIN "Order" AS customer_order ON customer_order."id" = item."orderId"
  WHERE customer_order."status" = 'COMPLETED' AND customer_order."deletedAt" IS NULL
  GROUP BY customer_order."organizationId"
) AS sales
WHERE organization."id" = sales."organizationId";
