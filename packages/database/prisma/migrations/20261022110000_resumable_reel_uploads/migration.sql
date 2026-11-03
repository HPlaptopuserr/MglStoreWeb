CREATE TABLE "ReelUploadSession" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "organizationId" TEXT,
  "visibility" "ReelVisibility" NOT NULL DEFAULT 'PUBLIC',
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "partSize" INTEGER NOT NULL,
  "partCount" INTEGER NOT NULL,
  "title" TEXT,
  "caption" TEXT,
  "productId" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'UPLOADING',
  "errorMessage" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "leaseUntil" TIMESTAMP(3),
  "leaseToken" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReelUploadSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReelUploadSession_status_check" CHECK ("status" IN ('UPLOADING','QUEUED','PROCESSING','SUCCEEDED','FAILED','CANCELLED')),
  CONSTRAINT "ReelUploadSession_size_check" CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 1073741824)
);
CREATE INDEX "ReelUploadSession_authorId_createdAt_idx" ON "ReelUploadSession"("authorId", "createdAt");
CREATE INDEX "ReelUploadSession_status_leaseUntil_createdAt_idx" ON "ReelUploadSession"("status", "leaseUntil", "createdAt");
CREATE INDEX "ReelUploadSession_expiresAt_idx" ON "ReelUploadSession"("expiresAt");
