import { prisma, InventoryReason } from "@mgl/database";
import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

interface AdjustStockInput {
  productId: string;
  warehouseId?: string;
  change: number;
  reason: InventoryReason;
  note?: string;
  createdById?: string | null;
  referenceId?: string;
  referenceType?: string;
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
export async function adjustStock(tx: Tx, input: AdjustStockInput): Promise<void> {
  const {
    productId,
    warehouseId,
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

  // Fallback: check if org has any assigned warehouse
  const assignment = await tx.warehouseOrganization.findFirst({
    where: { organizationId },
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
