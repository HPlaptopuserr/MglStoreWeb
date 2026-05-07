-- AddIndex: composite index for fast public product listing (deletedAt + isActive + createdAt)
CREATE INDEX IF NOT EXISTS "Product_deletedAt_isActive_createdAt_idx" ON "Product"("deletedAt", "isActive", "createdAt" DESC);

-- AddIndex: composite index for category-filtered product listing
CREATE INDEX IF NOT EXISTS "Product_businessCategoryId_deletedAt_isActive_idx" ON "Product"("businessCategoryId", "deletedAt", "isActive");

-- AddIndex: composite index for org-filtered product listing
CREATE INDEX IF NOT EXISTS "Product_organizationId_deletedAt_isActive_idx" ON "Product"("organizationId", "deletedAt", "isActive");
