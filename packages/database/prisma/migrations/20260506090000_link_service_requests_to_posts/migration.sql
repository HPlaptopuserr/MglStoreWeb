ALTER TABLE "ServiceRequest" ADD COLUMN IF NOT EXISTS "servicePostId" TEXT;

CREATE INDEX IF NOT EXISTS "ServiceRequest_servicePostId_idx" ON "ServiceRequest"("servicePostId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ServiceRequest_servicePostId_fkey'
  ) THEN
    ALTER TABLE "ServiceRequest"
      ADD CONSTRAINT "ServiceRequest_servicePostId_fkey"
      FOREIGN KEY ("servicePostId") REFERENCES "ServicePost"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
