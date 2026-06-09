ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "membershipPaidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "membershipStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "membershipExpiresAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_membershipExpiresAt_idx" ON "User"("membershipExpiresAt");
