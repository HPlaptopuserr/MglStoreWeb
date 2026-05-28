ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "webQpayMerchantId" TEXT,
  ADD COLUMN IF NOT EXISTS "webQpayMerchantKey" TEXT,
  ADD COLUMN IF NOT EXISTS "webQpayInvoiceCode" TEXT,
  ADD COLUMN IF NOT EXISTS "webQpayBankAccounts" JSONB,
  ADD COLUMN IF NOT EXISTS "webQpayEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "webQpayConnectedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_webQpayMerchantId_key"
  ON "Organization"("webQpayMerchantId");
