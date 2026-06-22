ALTER TABLE "PosCreditSale"
  ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod",
  ADD COLUMN IF NOT EXISTS "paymentNote" TEXT;
