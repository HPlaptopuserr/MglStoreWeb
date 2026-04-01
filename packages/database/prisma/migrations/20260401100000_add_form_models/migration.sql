-- CreateTable
CREATE TABLE IF NOT EXISTS "Form" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FormResponse" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Form_slug_key" ON "Form"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Form_slug_idx" ON "Form"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Form_isActive_idx" ON "Form"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Form_createdById_idx" ON "Form"("createdById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Form_createdAt_idx" ON "Form"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FormResponse_formId_idx" ON "FormResponse"("formId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FormResponse_submittedAt_idx" ON "FormResponse"("submittedAt");

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
