DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReelStatus') THEN
    CREATE TYPE "ReelStatus" AS ENUM ('DRAFT', 'PROCESSING', 'READY', 'FAILED', 'ARCHIVED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReelVisibility') THEN
    CREATE TYPE "ReelVisibility" AS ENUM ('PUBLIC', 'ORGANIZATION', 'UNLISTED', 'PRIVATE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReelAssetKind') THEN
    CREATE TYPE "ReelAssetKind" AS ENUM ('ORIGINAL', 'MP4_720P', 'MP4_480P', 'THUMBNAIL', 'HLS_PLAYLIST', 'HLS_SEGMENT', 'CAPTION_TRACK');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReelProcessingStatus') THEN
    CREATE TYPE "ReelProcessingStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReelInteractionType') THEN
    CREATE TYPE "ReelInteractionType" AS ENUM ('VIEW', 'LIKE', 'SAVE', 'SHARE', 'COMMENT', 'FOLLOW_CLICK', 'PRODUCT_CLICK');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Reel" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "authorId" TEXT,
  "reviewedById" TEXT,
  "businessCategoryId" TEXT,
  "productId" TEXT,
  "title" TEXT,
  "caption" TEXT,
  "description" TEXT,
  "videoUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "storageBucket" TEXT,
  "storagePath" TEXT,
  "hlsUrl" TEXT,
  "durationSeconds" INTEGER,
  "width" INTEGER,
  "height" INTEGER,
  "fileSizeBytes" BIGINT,
  "mimeType" TEXT,
  "status" "ReelStatus" NOT NULL DEFAULT 'DRAFT',
  "visibility" "ReelVisibility" NOT NULL DEFAULT 'PUBLIC',
  "reviewStatus" "VendorContentReviewStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "failedReason" TEXT,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "likeCount" INTEGER NOT NULL DEFAULT 0,
  "saveCount" INTEGER NOT NULL DEFAULT 0,
  "shareCount" INTEGER NOT NULL DEFAULT 0,
  "commentCount" INTEGER NOT NULL DEFAULT 0,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "Reel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReelAsset" (
  "id" TEXT NOT NULL,
  "reelId" TEXT NOT NULL,
  "kind" "ReelAssetKind" NOT NULL,
  "url" TEXT NOT NULL,
  "storageBucket" TEXT,
  "storagePath" TEXT,
  "mimeType" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "durationSeconds" INTEGER,
  "fileSizeBytes" BIGINT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReelAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReelProcessingJob" (
  "id" TEXT NOT NULL,
  "reelId" TEXT NOT NULL,
  "status" "ReelProcessingStatus" NOT NULL DEFAULT 'QUEUED',
  "queueName" TEXT,
  "provider" TEXT,
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReelProcessingJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReelInteraction" (
  "id" TEXT NOT NULL,
  "reelId" TEXT NOT NULL,
  "userId" TEXT,
  "visitorId" TEXT,
  "organizationId" TEXT,
  "type" "ReelInteractionType" NOT NULL,
  "watchSeconds" INTEGER,
  "watchPercent" DOUBLE PRECISION,
  "source" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReelInteraction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Reel_organizationId_createdAt_idx" ON "Reel"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Reel_organizationId_status_publishedAt_idx" ON "Reel"("organizationId", "status", "publishedAt");
CREATE INDEX IF NOT EXISTS "Reel_authorId_createdAt_idx" ON "Reel"("authorId", "createdAt");
CREATE INDEX IF NOT EXISTS "Reel_businessCategoryId_publishedAt_idx" ON "Reel"("businessCategoryId", "publishedAt");
CREATE INDEX IF NOT EXISTS "Reel_productId_idx" ON "Reel"("productId");
CREATE INDEX IF NOT EXISTS "Reel_status_visibility_publishedAt_idx" ON "Reel"("status", "visibility", "publishedAt");
CREATE INDEX IF NOT EXISTS "Reel_reviewStatus_idx" ON "Reel"("reviewStatus");
CREATE INDEX IF NOT EXISTS "Reel_deletedAt_idx" ON "Reel"("deletedAt");

CREATE INDEX IF NOT EXISTS "ReelAsset_reelId_idx" ON "ReelAsset"("reelId");
CREATE INDEX IF NOT EXISTS "ReelAsset_kind_idx" ON "ReelAsset"("kind");
CREATE INDEX IF NOT EXISTS "ReelAsset_storageBucket_storagePath_idx" ON "ReelAsset"("storageBucket", "storagePath");

CREATE INDEX IF NOT EXISTS "ReelProcessingJob_reelId_createdAt_idx" ON "ReelProcessingJob"("reelId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReelProcessingJob_status_createdAt_idx" ON "ReelProcessingJob"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ReelProcessingJob_provider_idx" ON "ReelProcessingJob"("provider");

CREATE INDEX IF NOT EXISTS "ReelInteraction_reelId_createdAt_idx" ON "ReelInteraction"("reelId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReelInteraction_userId_createdAt_idx" ON "ReelInteraction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReelInteraction_visitorId_createdAt_idx" ON "ReelInteraction"("visitorId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReelInteraction_organizationId_createdAt_idx" ON "ReelInteraction"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReelInteraction_type_createdAt_idx" ON "ReelInteraction"("type", "createdAt");

ALTER TABLE "Reel"
ADD CONSTRAINT "Reel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Reel_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Reel_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Reel_businessCategoryId_fkey" FOREIGN KEY ("businessCategoryId") REFERENCES "BusinessCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Reel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReelAsset"
ADD CONSTRAINT "ReelAsset_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReelProcessingJob"
ADD CONSTRAINT "ReelProcessingJob_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReelInteraction"
ADD CONSTRAINT "ReelInteraction_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "ReelInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "ReelInteraction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
