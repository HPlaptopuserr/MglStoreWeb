import { prisma, InventoryReason, WarehouseType } from "@mgl/database";
import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

interface AdjustStockInput {
  productId: string;
  warehouseId?: string;
  branchId?: string;
  change: number;
  reason: InventoryReason;
  note?: string;
  createdById?: string | null;
  referenceId?: string;
  referenceType?: string;
}

async function consumePosReceiptLotsFefo(
  tx: Tx,
  input: {
    productId: string;
    branchId: string;
    quantity: number;
    referenceId: string;
  },
) {
  let quantityToAllocate = input.quantity;
  let attempts = 0;

  while (quantityToAllocate > 0 && attempts < 10) {
    attempts += 1;
    const lots = await tx.posGoodsReceiptItem.findMany({
      where: {
        productId: input.productId,
        remainingQuantity: { gt: 0 },
        receipt: { branchId: input.branchId },
      },
      orderBy: [
        { expiryDate: { sort: "asc", nulls: "last" } },
        { createdAt: "asc" },
      ],
      select: { id: true, remainingQuantity: true },
    });
    if (lots.length === 0) break;

    let allocatedThisAttempt = 0;
    for (const lot of lots) {
      if (quantityToAllocate <= 0) break;
      const quantity = Math.min(lot.remainingQuantity, quantityToAllocate);
      const updated = await tx.posGoodsReceiptItem.updateMany({
        where: { id: lot.id, remainingQuantity: { gte: quantity } },
        data: { remainingQuantity: { decrement: quantity } },
      });
      if (updated.count === 0) continue;

      await tx.posGoodsReceiptAllocation.create({
        data: {
          receiptItemId: lot.id,
          referenceId: input.referenceId,
          referenceType: "POS_SALE",
          quantity,
        },
      });
      quantityToAllocate -= quantity;
      allocatedThisAttempt += quantity;
    }

    if (allocatedThisAttempt === 0) break;
  }

  // Existing stock created before lot tracking has no receipt item. It remains
  // valid legacy stock, so an unallocated remainder must not block the sale.
}

async function restorePosReceiptLots(
  tx: Tx,
  input: {
    productId: string;
    branchId: string;
    referenceId: string;
  },
) {
  const allocations = await tx.posGoodsReceiptAllocation.findMany({
    where: {
      referenceId: input.referenceId,
      referenceType: "POS_SALE",
      reversedAt: null,
      receiptItem: {
        productId: input.productId,
        receipt: { branchId: input.branchId },
      },
    },
    select: { id: true, receiptItemId: true, quantity: true },
  });

  const reversedAt = new Date();
  for (const allocation of allocations) {
    const reversed = await tx.posGoodsReceiptAllocation.updateMany({
      where: { id: allocation.id, reversedAt: null },
      data: { reversedAt },
    });
    if (reversed.count === 0) continue;
    await tx.posGoodsReceiptItem.update({
      where: { id: allocation.receiptItemId },
      data: { remainingQuantity: { increment: allocation.quantity } },
    });
  }
}

/**
 * Single entry point for ALL stock changes.
 *
 * Rules:
 * 1. If warehouseId is provided → update WarehouseInventory first, then sync Product.stock
 * 2. If warehouseId is NOT provided → update Product.stock directly (for orgs without warehouse)
 * 3. Always create an InventoryLedger entry
 *
 * Must be called inside a Prisma transaction (pass `tx`).
 */
export async function adjustStock(
  tx: Tx,
  input: AdjustStockInput,
): Promise<void> {
  const {
    productId,
    warehouseId,
    branchId,
    change,
    reason,
    note,
    createdById,
    referenceId,
    referenceType,
  } = input;

  if (warehouseId) {
    // Update warehouse inventory (upsert to handle missing records)
    await tx.warehouseInventory.upsert({
      where: {
        warehouseId_productId: { warehouseId, productId },
      },
      update: {
        quantity: { increment: change },
      },
      create: {
        warehouseId,
        productId,
        quantity: change,
      },
    });

    // Sync Product.stock = SUM(all warehouse quantities)
    const result = await tx.warehouseInventory.aggregate({
      where: { productId },
      _sum: { quantity: true },
    });

    await tx.product.update({
      where: { id: productId },
      data: { stock: result._sum.quantity ?? 0 },
    });
  } else {
    // No warehouse — direct Product.stock update
    await tx.product.update({
      where: { id: productId },
      data: { stock: { increment: change } },
    });
  }

  if (change < 0 && branchId && referenceId && referenceType === "POS_SALE") {
    await consumePosReceiptLotsFefo(tx, {
      productId,
      branchId,
      quantity: Math.abs(change),
      referenceId,
    });
  } else if (
    change > 0 &&
    branchId &&
    referenceId &&
    referenceType === "POS_VOID"
  ) {
    await restorePosReceiptLots(tx, { productId, branchId, referenceId });
  }

  // Always log to ledger
  await tx.inventoryLedger.create({
    data: {
      productId,
      change,
      reason,
      note: note || null,
      createdById: createdById || null,
      referenceId: referenceId || null,
      referenceType: referenceType || null,
    },
  });
}

/**
 * Resolve the primary warehouse for an organization.
 * Returns warehouseId if the org has exactly one assigned warehouse,
 * or the first warehouse if multiple. Returns null if none.
 */
export async function resolveOrgWarehouse(
  tx: Tx,
  organizationId: string,
  productId: string,
): Promise<string | null> {
  // Check if product has any warehouse inventory
  const inventory = await tx.warehouseInventory.findFirst({
    where: { productId },
    select: { warehouseId: true },
  });

  if (inventory) return inventory.warehouseId;

  // Vendor products belong to the organization's internal inventory warehouse,
  // never to a centrally operated distribution warehouse.
  const assignment = await tx.warehouseOrganization.findFirst({
    where: {
      organizationId,
      warehouse: {
        type: WarehouseType.VENDOR_INTERNAL,
        isActive: true,
        deletedAt: null,
      },
    },
    select: { warehouseId: true },
  });

  return assignment?.warehouseId ?? null;
}

/**
 * Recalculate Product.stock = SUM(WarehouseInventory.quantity).
 * Works both inside and outside a transaction.
 */
export async function syncProductStock(
  txOrPrisma: Tx,
  productId: string,
): Promise<void> {
  const result = await txOrPrisma.warehouseInventory.aggregate({
    where: { productId },
    _sum: { quantity: true },
  });
  await txOrPrisma.product.update({
    where: { id: productId },
    data: { stock: result._sum.quantity ?? 0 },
  });
}
