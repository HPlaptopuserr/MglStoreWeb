/*
  Warnings:

  - You are about to drop the column `status` on the `OrderHistory` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `RegistrationRequest` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderNumber]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Discount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderNumber` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `toStatus` to the `OrderHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productName` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryReason" ADD VALUE 'ORDER_CANCEL';
ALTER TYPE "InventoryReason" ADD VALUE 'DAMAGE';
ALTER TYPE "InventoryReason" ADD VALUE 'TRANSFER_IN';
ALTER TYPE "InventoryReason" ADD VALUE 'TRANSFER_OUT';
ALTER TYPE "InventoryReason" ADD VALUE 'INITIAL_STOCK';

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "validFrom" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "InventoryLedger" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "referenceId" TEXT,
ADD COLUMN     "referenceType" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "orderNumber" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "OrderHistory" DROP COLUMN "status",
ADD COLUMN     "fromStatus" "OrderStatus",
ADD COLUMN     "toStatus" "OrderStatus" NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "productName" TEXT NOT NULL,
ADD COLUMN     "productSku" TEXT;

-- AlterTable
ALTER TABLE "RegistrationRequest" DROP COLUMN "password",
ADD COLUMN     "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "password",
ADD COLUMN     "passwordHash" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Delivery_createdAt_idx" ON "Delivery"("createdAt");

-- CreateIndex
CREATE INDEX "Discount_isActive_idx" ON "Discount"("isActive");

-- CreateIndex
CREATE INDEX "InventoryLedger_reason_idx" ON "InventoryLedger"("reason");

-- CreateIndex
CREATE INDEX "InventoryLedger_referenceType_referenceId_idx" ON "InventoryLedger"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "InventoryLedger_createdById_idx" ON "InventoryLedger"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "ReturnRequest_createdAt_idx" ON "ReturnRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "InventoryLedger" ADD CONSTRAINT "InventoryLedger_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
