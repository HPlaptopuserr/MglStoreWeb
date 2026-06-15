-- Store marketplace behavior signals and derived interest scores for product recommendations.

CREATE TYPE "ProductInteractionType" AS ENUM (
  'VIEW',
  'SEARCH',
  'CATEGORY_VIEW',
  'ADD_TO_CART',
  'WISHLIST',
  'SHARE',
  'RECOMMENDATION_CLICK',
  'PURCHASE'
);

CREATE TABLE "ProductInteraction" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "visitorId" TEXT,
  "productId" TEXT,
  "businessCategoryId" TEXT,
  "organizationId" TEXT,
  "type" "ProductInteractionType" NOT NULL,
  "searchQuery" TEXT,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "source" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductInteraction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductInterestScore" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "visitorId" TEXT,
  "productId" TEXT,
  "businessCategoryId" TEXT,
  "organizationId" TEXT,
  "keyword" TEXT,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastEventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductInterestScore_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductInteraction_userId_createdAt_idx" ON "ProductInteraction"("userId", "createdAt");
CREATE INDEX "ProductInteraction_visitorId_createdAt_idx" ON "ProductInteraction"("visitorId", "createdAt");
CREATE INDEX "ProductInteraction_productId_createdAt_idx" ON "ProductInteraction"("productId", "createdAt");
CREATE INDEX "ProductInteraction_businessCategoryId_createdAt_idx" ON "ProductInteraction"("businessCategoryId", "createdAt");
CREATE INDEX "ProductInteraction_organizationId_createdAt_idx" ON "ProductInteraction"("organizationId", "createdAt");
CREATE INDEX "ProductInteraction_type_createdAt_idx" ON "ProductInteraction"("type", "createdAt");

CREATE UNIQUE INDEX "ProductInterestScore_user_product_interest_key" ON "ProductInterestScore"("userId", "productId");
CREATE UNIQUE INDEX "ProductInterestScore_visitor_product_interest_key" ON "ProductInterestScore"("visitorId", "productId");
CREATE UNIQUE INDEX "ProductInterestScore_user_category_interest_key" ON "ProductInterestScore"("userId", "businessCategoryId");
CREATE UNIQUE INDEX "ProductInterestScore_visitor_category_interest_key" ON "ProductInterestScore"("visitorId", "businessCategoryId");
CREATE UNIQUE INDEX "ProductInterestScore_user_organization_interest_key" ON "ProductInterestScore"("userId", "organizationId");
CREATE UNIQUE INDEX "ProductInterestScore_visitor_organization_interest_key" ON "ProductInterestScore"("visitorId", "organizationId");
CREATE UNIQUE INDEX "ProductInterestScore_user_keyword_interest_key" ON "ProductInterestScore"("userId", "keyword");
CREATE UNIQUE INDEX "ProductInterestScore_visitor_keyword_interest_key" ON "ProductInterestScore"("visitorId", "keyword");
CREATE INDEX "ProductInterestScore_userId_score_idx" ON "ProductInterestScore"("userId", "score");
CREATE INDEX "ProductInterestScore_visitorId_score_idx" ON "ProductInterestScore"("visitorId", "score");
CREATE INDEX "ProductInterestScore_lastEventAt_idx" ON "ProductInterestScore"("lastEventAt");

ALTER TABLE "ProductInteraction"
  ADD CONSTRAINT "ProductInteraction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductInteraction"
  ADD CONSTRAINT "ProductInteraction_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductInteraction"
  ADD CONSTRAINT "ProductInteraction_businessCategoryId_fkey"
  FOREIGN KEY ("businessCategoryId") REFERENCES "BusinessCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductInteraction"
  ADD CONSTRAINT "ProductInteraction_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductInterestScore"
  ADD CONSTRAINT "ProductInterestScore_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductInterestScore"
  ADD CONSTRAINT "ProductInterestScore_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductInterestScore"
  ADD CONSTRAINT "ProductInterestScore_businessCategoryId_fkey"
  FOREIGN KEY ("businessCategoryId") REFERENCES "BusinessCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductInterestScore"
  ADD CONSTRAINT "ProductInterestScore_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
