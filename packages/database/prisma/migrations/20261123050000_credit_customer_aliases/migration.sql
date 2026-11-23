BEGIN;
-- Preserve original saved borrower records and historical loan references.
-- Explicitly reviewed aliases are hidden from new-borrower selection only.
ALTER TABLE "PosCreditCustomer" ADD COLUMN "mergedIntoId" TEXT;
CREATE INDEX "PosCreditCustomer_mergedIntoId_idx" ON "PosCreditCustomer"("mergedIntoId");
ALTER TABLE "PosCreditCustomer" ADD CONSTRAINT "PosCreditCustomer_mergedIntoId_fkey"
  FOREIGN KEY ("mergedIntoId") REFERENCES "PosCreditCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCreditCustomer" ADD CONSTRAINT "PosCreditCustomer_no_self_alias"
  CHECK ("mergedIntoId" IS NULL OR "mergedIntoId" <> "id");
COMMIT;
