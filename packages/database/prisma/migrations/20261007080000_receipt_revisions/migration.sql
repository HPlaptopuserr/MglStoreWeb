ALTER TABLE "PosGoodsReceipt" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "mergedIntoId" TEXT;
ALTER TABLE "PosGoodsReceipt" ADD CONSTRAINT "PosGoodsReceipt_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "PosGoodsReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "PosGoodsReceiptRevision" (
 "id" TEXT NOT NULL PRIMARY KEY, "receiptId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
 "actorName" TEXT NOT NULL, "kind" TEXT NOT NULL, "reason" TEXT NOT NULL,
 "changes" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PosGoodsReceiptRevision_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PosGoodsReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PosGoodsReceiptRevision_receiptId_createdAt_idx" ON "PosGoodsReceiptRevision"("receiptId", "createdAt");
