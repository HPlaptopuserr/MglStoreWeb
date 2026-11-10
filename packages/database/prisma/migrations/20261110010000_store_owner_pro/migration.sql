-- CreateTable
CREATE TABLE "StoreOwnerProPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PlanPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "merchantCode" TEXT NOT NULL,
    "merchantUsername" TEXT NOT NULL,
    "providerInvoiceId" TEXT,
    "qrText" TEXT NOT NULL DEFAULT '',
    "deepLinks" JSONB NOT NULL DEFAULT '[]',
    "invoiceExpiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "accessExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreOwnerProPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreOwnerProPayment_providerInvoiceId_key" ON "StoreOwnerProPayment"("providerInvoiceId");

-- CreateIndex
CREATE INDEX "StoreOwnerProPayment_userId_status_accessExpiresAt_idx" ON "StoreOwnerProPayment"("userId", "status", "accessExpiresAt");

-- CreateIndex
CREATE INDEX "StoreOwnerProPayment_userId_status_invoiceExpiresAt_idx" ON "StoreOwnerProPayment"("userId", "status", "invoiceExpiresAt");

-- AddForeignKey
ALTER TABLE "StoreOwnerProPayment" ADD CONSTRAINT "StoreOwnerProPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
