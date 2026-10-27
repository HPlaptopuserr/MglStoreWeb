CREATE TABLE "BarilgaPurchaseContract" (
"id" TEXT NOT NULL, "unitId" TEXT NOT NULL, "buyerId" TEXT NOT NULL, "createdById" TEXT NOT NULL,
"requestKey" TEXT NOT NULL, "snapshot" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
"sellerAcceptedAt" TIMESTAMP(3), "sellerAcceptedById" TEXT, "buyerAcceptedAt" TIMESTAMP(3),
"reservationId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "BarilgaPurchaseContract_pkey" PRIMARY KEY ("id"),
CONSTRAINT "BarilgaPurchaseContract_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BarilgaUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
CONSTRAINT "BarilgaPurchaseContract_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BarilgaPurchaseContract_requestKey_key" ON "BarilgaPurchaseContract"("requestKey");
CREATE UNIQUE INDEX "BarilgaPurchaseContract_reservationId_key" ON "BarilgaPurchaseContract"("reservationId");
CREATE INDEX "BarilgaPurchaseContract_buyerId_status_idx" ON "BarilgaPurchaseContract"("buyerId", "status");
CREATE INDEX "BarilgaPurchaseContract_unitId_status_idx" ON "BarilgaPurchaseContract"("unitId", "status");
