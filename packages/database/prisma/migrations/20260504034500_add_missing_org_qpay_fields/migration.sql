-- Add organization-level QPay fields that were introduced in the Prisma schema
-- but missing from the previous payment plan migration.
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "qpayInvoiceCode" TEXT,
  ADD COLUMN IF NOT EXISTS "qpayBankAccounts" JSONB;
