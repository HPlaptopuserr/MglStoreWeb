CREATE TABLE "VisualSearchEmbedding" (
  "imageId" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "embeddingVersion" TEXT NOT NULL,
  "contentHash" TEXT,
  "vector" JSONB,
  "indexedAt" TIMESTAMP(3),
  "leaseToken" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "retryAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VisualSearchEmbedding_imageId_fkey" FOREIGN KEY ("imageId")
    REFERENCES "ProductImage"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "VisualSearchEmbedding_embeddingVersion_updatedAt_idx"
  ON "VisualSearchEmbedding"("embeddingVersion", "updatedAt");

-- Invalidate even when a caller explicitly rewrites the same URL after replacing
-- its bytes. Normal uploads use immutable, uniquely named objects.
CREATE FUNCTION invalidate_visual_search_image() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "VisualSearchEmbedding" WHERE "imageId" = NEW."id";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "ProductImage_invalidate_visual_search"
  AFTER UPDATE OF "url" ON "ProductImage"
  FOR EACH ROW EXECUTE FUNCTION invalidate_visual_search_image();
