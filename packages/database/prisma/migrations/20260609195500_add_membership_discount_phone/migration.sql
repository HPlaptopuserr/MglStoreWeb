ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "membershipDiscountPhone" TEXT;

CREATE INDEX IF NOT EXISTS "User_membershipDiscountPhone_idx" ON "User"("membershipDiscountPhone");
