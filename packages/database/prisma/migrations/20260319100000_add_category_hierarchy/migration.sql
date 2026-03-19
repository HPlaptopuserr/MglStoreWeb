-- AlterTable (add parentId and level to BusinessCategory if not exists)
ALTER TABLE "BusinessCategory" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
ALTER TABLE "BusinessCategory" ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BusinessCategory_parentId_idx" ON "BusinessCategory"("parentId");
CREATE INDEX IF NOT EXISTS "BusinessCategory_level_idx" ON "BusinessCategory"("level");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'BusinessCategory_parentId_fkey'
    AND table_name = 'BusinessCategory'
  ) THEN
    ALTER TABLE "BusinessCategory" ADD CONSTRAINT "BusinessCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "BusinessCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
