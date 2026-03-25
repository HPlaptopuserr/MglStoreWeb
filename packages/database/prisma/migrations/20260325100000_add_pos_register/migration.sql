-- CreateTable
CREATE TABLE IF NOT EXISTS "PosRegister" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "cardEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cardProviderType" TEXT,
    "cardTerminalId" TEXT,
    "terminalBridgeUrl" TEXT,
    "qpayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "qpayMerchantId" TEXT,
    "qpayTerminalId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosRegister_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PosRegister_organizationId_idx" ON "PosRegister"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PosRegister_branchId_idx" ON "PosRegister"("branchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PosRegister_isActive_idx" ON "PosRegister"("isActive");

-- AddForeignKey
ALTER TABLE "PosRegister" ADD CONSTRAINT "PosRegister_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosRegister" ADD CONSTRAINT "PosRegister_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
