CREATE TABLE "StockPaymentReceipt" (
  "id" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "content" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockPaymentReceipt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockPaymentReceipt_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "StockRequestPaymentEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StockPaymentReceipt_entryId_key" ON "StockPaymentReceipt"("entryId");
