ALTER TABLE "PosCreditCustomer"
  ADD COLUMN IF NOT EXISTS "borrowerEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "borrowerAddress" TEXT;

ALTER TABLE "PosCreditSale"
  ADD COLUMN IF NOT EXISTS "borrowerEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "borrowerAddress" TEXT;
