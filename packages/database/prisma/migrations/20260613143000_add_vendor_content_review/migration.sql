DO $$ BEGIN
  CREATE TYPE "VendorContentReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "submittedById" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedById" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewStatus" "VendorContentReviewStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

ALTER TABLE "ServicePost"
  ADD COLUMN IF NOT EXISTS "submittedById" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedById" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewStatus" "VendorContentReviewStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

ALTER TABLE "Post"
  ADD COLUMN IF NOT EXISTS "submittedById" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedById" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewStatus" "VendorContentReviewStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Product_reviewStatus_idx" ON "Product"("reviewStatus");
CREATE INDEX IF NOT EXISTS "Product_submittedById_idx" ON "Product"("submittedById");
CREATE INDEX IF NOT EXISTS "ServicePost_reviewStatus_idx" ON "ServicePost"("reviewStatus");
CREATE INDEX IF NOT EXISTS "ServicePost_submittedById_idx" ON "ServicePost"("submittedById");
CREATE INDEX IF NOT EXISTS "Post_reviewStatus_idx" ON "Post"("reviewStatus");
CREATE INDEX IF NOT EXISTS "Post_submittedById_idx" ON "Post"("submittedById");
