CREATE TABLE "PosCardStockReservation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientSaleId" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PosCardStockReservation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pos_card_stock_checkout_product_key"
    ON "PosCardStockReservation"("organizationId", "clientSaleId", "productId");
CREATE INDEX "PosCardStockReservation_productId_idx" ON "PosCardStockReservation"("productId");
