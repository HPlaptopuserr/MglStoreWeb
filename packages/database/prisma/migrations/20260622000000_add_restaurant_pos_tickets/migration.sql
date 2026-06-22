CREATE TYPE "RestaurantOrderMode" AS ENUM ('DINE_IN', 'TO_GO', 'DELIVERY');
CREATE TYPE "RestaurantTicketStatus" AS ENUM ('OPEN', 'KITCHEN', 'READY', 'SERVED', 'PAID', 'CANCELLED');
CREATE TYPE "KitchenTicketStatus" AS ENUM ('NEW', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');

CREATE TABLE "RestaurantTable" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "zone" TEXT NOT NULL DEFAULT 'Гол заал',
  "seats" INTEGER NOT NULL DEFAULT 4,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RestaurantTicket" (
  "id" TEXT NOT NULL,
  "ticketNo" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "shiftId" TEXT NOT NULL,
  "tableId" TEXT,
  "openedById" TEXT NOT NULL,
  "posSaleId" TEXT,
  "orderMode" "RestaurantOrderMode" NOT NULL DEFAULT 'DINE_IN',
  "status" "RestaurantTicketStatus" NOT NULL DEFAULT 'OPEN',
  "guestCount" INTEGER NOT NULL DEFAULT 1,
  "note" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestaurantTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RestaurantTicketItem" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "unitPrice" DECIMAL(18, 2) NOT NULL,
  "qty" INTEGER NOT NULL,
  "sentQty" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "kitchenStation" TEXT,
  "preparationMinutes" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestaurantTicketItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitchenTicket" (
  "id" TEXT NOT NULL,
  "kitchenTicketNo" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "restaurantTicketId" TEXT NOT NULL,
  "sentById" TEXT NOT NULL,
  "status" "KitchenTicketStatus" NOT NULL DEFAULT 'NEW',
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "readyAt" TIMESTAMP(3),
  "servedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KitchenTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitchenTicketItem" (
  "id" TEXT NOT NULL,
  "kitchenTicketId" TEXT NOT NULL,
  "restaurantTicketItemId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "note" TEXT,
  "kitchenStation" TEXT,
  "preparationMinutes" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KitchenTicketItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RestaurantTable_branchId_code_key" ON "RestaurantTable"("branchId", "code");
CREATE INDEX "RestaurantTable_organizationId_idx" ON "RestaurantTable"("organizationId");
CREATE INDEX "RestaurantTable_branchId_isActive_idx" ON "RestaurantTable"("branchId", "isActive");
CREATE INDEX "RestaurantTable_branchId_sortOrder_idx" ON "RestaurantTable"("branchId", "sortOrder");

CREATE UNIQUE INDEX "RestaurantTicket_ticketNo_key" ON "RestaurantTicket"("ticketNo");
CREATE UNIQUE INDEX "RestaurantTicket_posSaleId_key" ON "RestaurantTicket"("posSaleId");
CREATE INDEX "RestaurantTicket_organizationId_status_idx" ON "RestaurantTicket"("organizationId", "status");
CREATE INDEX "RestaurantTicket_branchId_status_idx" ON "RestaurantTicket"("branchId", "status");
CREATE INDEX "RestaurantTicket_shiftId_idx" ON "RestaurantTicket"("shiftId");
CREATE INDEX "RestaurantTicket_tableId_status_idx" ON "RestaurantTicket"("tableId", "status");
CREATE INDEX "RestaurantTicket_openedById_idx" ON "RestaurantTicket"("openedById");
CREATE INDEX "RestaurantTicket_openedAt_idx" ON "RestaurantTicket"("openedAt");

CREATE UNIQUE INDEX "RestaurantTicketItem_ticketId_productId_key" ON "RestaurantTicketItem"("ticketId", "productId");
CREATE INDEX "RestaurantTicketItem_productId_idx" ON "RestaurantTicketItem"("productId");

CREATE UNIQUE INDEX "KitchenTicket_kitchenTicketNo_key" ON "KitchenTicket"("kitchenTicketNo");
CREATE INDEX "KitchenTicket_organizationId_status_idx" ON "KitchenTicket"("organizationId", "status");
CREATE INDEX "KitchenTicket_branchId_status_idx" ON "KitchenTicket"("branchId", "status");
CREATE INDEX "KitchenTicket_restaurantTicketId_idx" ON "KitchenTicket"("restaurantTicketId");
CREATE INDEX "KitchenTicket_sentById_idx" ON "KitchenTicket"("sentById");
CREATE INDEX "KitchenTicket_sentAt_idx" ON "KitchenTicket"("sentAt");

CREATE INDEX "KitchenTicketItem_kitchenTicketId_idx" ON "KitchenTicketItem"("kitchenTicketId");
CREATE INDEX "KitchenTicketItem_restaurantTicketItemId_idx" ON "KitchenTicketItem"("restaurantTicketItemId");
CREATE INDEX "KitchenTicketItem_productId_idx" ON "KitchenTicketItem"("productId");
CREATE INDEX "KitchenTicketItem_kitchenStation_idx" ON "KitchenTicketItem"("kitchenStation");

ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantTicket" ADD CONSTRAINT "RestaurantTicket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantTicket" ADD CONSTRAINT "RestaurantTicket_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantTicket" ADD CONSTRAINT "RestaurantTicket_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "PosShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RestaurantTicket" ADD CONSTRAINT "RestaurantTicket_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RestaurantTicket" ADD CONSTRAINT "RestaurantTicket_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RestaurantTicket" ADD CONSTRAINT "RestaurantTicket_posSaleId_fkey" FOREIGN KEY ("posSaleId") REFERENCES "PosSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RestaurantTicketItem" ADD CONSTRAINT "RestaurantTicketItem_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "RestaurantTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantTicketItem" ADD CONSTRAINT "RestaurantTicketItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_restaurantTicketId_fkey" FOREIGN KEY ("restaurantTicketId") REFERENCES "RestaurantTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KitchenTicketItem" ADD CONSTRAINT "KitchenTicketItem_kitchenTicketId_fkey" FOREIGN KEY ("kitchenTicketId") REFERENCES "KitchenTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenTicketItem" ADD CONSTRAINT "KitchenTicketItem_restaurantTicketItemId_fkey" FOREIGN KEY ("restaurantTicketItemId") REFERENCES "RestaurantTicketItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KitchenTicketItem" ADD CONSTRAINT "KitchenTicketItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
