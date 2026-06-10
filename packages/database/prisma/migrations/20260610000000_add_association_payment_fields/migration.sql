ALTER TABLE "AssociationMemberRegistration"
  ADD COLUMN "paymentAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "paymentMethod" "PaymentMethod" DEFAULT 'BANK_TRANSFER',
  ADD COLUMN "paymentReference" TEXT,
  ADD COLUMN "paymentNote" TEXT,
  ADD COLUMN "paidAt" TIMESTAMP(3);
