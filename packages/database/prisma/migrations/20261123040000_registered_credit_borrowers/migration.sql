BEGIN;
-- Existing borrower snapshots and debt balances remain unchanged. New issuance
-- requires a registered user in the application; historical links stay nullable.
ALTER TABLE "PosCreditCustomer" ADD COLUMN "borrowerUserId" TEXT;
ALTER TABLE "PosCreditSale" ADD COLUMN "borrowerUserId" TEXT;
CREATE INDEX "PosCreditCustomer_borrowerUserId_idx" ON "PosCreditCustomer"("borrowerUserId");
CREATE INDEX "PosCreditSale_borrowerUserId_idx" ON "PosCreditSale"("borrowerUserId");
ALTER TABLE "PosCreditCustomer" ADD CONSTRAINT "PosCreditCustomer_borrowerUserId_fkey"
  FOREIGN KEY ("borrowerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCreditSale" ADD CONSTRAINT "PosCreditSale_borrowerUserId_fkey"
  FOREIGN KEY ("borrowerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Match formatted legacy phone numbers without a global fuzzy user search.
CREATE INDEX "Profile_canonical_phone_lookup_idx" ON "Profile"(canonical_profile_phone_number("phoneNumber"));

COMMIT;
