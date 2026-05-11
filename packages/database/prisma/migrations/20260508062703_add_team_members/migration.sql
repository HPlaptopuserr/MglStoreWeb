-- DropIndex
DROP INDEX "Product_businessCategoryId_deletedAt_isActive_idx";

-- DropIndex
DROP INDEX "Product_deletedAt_isActive_createdAt_idx";

-- DropIndex
DROP INDEX "Product_organizationId_deletedAt_isActive_idx";

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "email" TEXT,
    "linkedinUrl" TEXT,
    "experience" TEXT,
    "skills" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamMember_isActive_idx" ON "TeamMember"("isActive");

-- CreateIndex
CREATE INDEX "TeamMember_order_idx" ON "TeamMember"("order");
