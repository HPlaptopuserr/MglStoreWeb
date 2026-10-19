-- CreateTable
CREATE TABLE "WarehouseRetailOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "checkoutKey" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "shippingAddress" TEXT NOT NULL,
    "note" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "total" DECIMAL(18,2) NOT NULL,
    "invoiceId" TEXT,
    "merchantCode" TEXT,
    "qrText" TEXT,
    "deepLinks" JSONB,
    "fulfillmentIssue" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseRetailOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseRetailOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "storedQuantity" INTEGER NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "WarehouseRetailOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseRetailOrder_orderNumber_key" ON "WarehouseRetailOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseRetailOrder_invoiceId_key" ON "WarehouseRetailOrder"("invoiceId");

-- CreateIndex
CREATE INDEX "WarehouseRetailOrder_warehouseId_status_paymentStatus_idx" ON "WarehouseRetailOrder"("warehouseId", "status", "paymentStatus");

-- CreateIndex
CREATE INDEX "WarehouseRetailOrder_customerId_createdAt_idx" ON "WarehouseRetailOrder"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "WarehouseRetailOrder_paymentStatus_expiresAt_idx" ON "WarehouseRetailOrder"("paymentStatus", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseRetailOrder_customerId_checkoutKey_key" ON "WarehouseRetailOrder"("customerId", "checkoutKey");

-- CreateIndex
CREATE INDEX "WarehouseRetailOrderItem_productId_idx" ON "WarehouseRetailOrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseRetailOrderItem_orderId_productId_key" ON "WarehouseRetailOrderItem"("orderId", "productId");

-- AddForeignKey
ALTER TABLE "WarehouseRetailOrder" ADD CONSTRAINT "WarehouseRetailOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseRetailOrder" ADD CONSTRAINT "WarehouseRetailOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseRetailOrderItem" ADD CONSTRAINT "WarehouseRetailOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "WarehouseRetailOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseRetailOrderItem" ADD CONSTRAINT "WarehouseRetailOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

