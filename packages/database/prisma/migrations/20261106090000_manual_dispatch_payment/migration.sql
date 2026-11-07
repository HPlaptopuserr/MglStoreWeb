CREATE TYPE "WarehouseDispatchPaymentStatus" AS ENUM ('PAID', 'CREDIT');
CREATE TYPE "WarehouseDispatchPaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'QPAY', 'OTHER');

-- Existing documents have no recorded payment information.
ALTER TABLE "WarehouseManualDispatch"
  ADD COLUMN "paymentStatus" "WarehouseDispatchPaymentStatus",
  ADD COLUMN "paymentMethod" "WarehouseDispatchPaymentMethod",
  ADD COLUMN "paymentNote" TEXT;

ALTER TABLE "WarehouseManualDispatch" ADD CONSTRAINT "WarehouseManualDispatch_payment_check"
  CHECK (
    ("paymentStatus" IS NULL AND "paymentMethod" IS NULL AND "paymentNote" IS NULL)
    OR ("paymentStatus" IS NOT NULL AND (
      ("paymentStatus" = 'CREDIT' AND "paymentMethod" IS NULL)
      OR ("paymentStatus" = 'PAID' AND "paymentMethod" IS NOT NULL)
    ))
  );
