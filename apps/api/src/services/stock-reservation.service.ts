import { Prisma, prisma } from "@mgl/database";

// Reservations derive from live requests: cancellation/rejection releases them
// without modifying physical stock or requiring a database migration.
export async function reservedStock(
  warehouseId: string,
  productIds: string[],
  db: Prisma.TransactionClient = prisma,
) {
  const items = await db.warehouseStockRequestItem.findMany({
    where: {
      productId: { in: productIds },
      request: {
        warehouseId,
        status: { in: ["PENDING", "APPROVED", "PROCESSING"] },
      },
    },
    select: {
      productId: true,
      quantity: true,
      approvedQuantity: true,
      request: { select: { status: true } },
    },
  });
  return sumReservedStock(items);
}

export function sumReservedStock(
  items: {
    productId: string;
    quantity: number;
    approvedQuantity: number | null;
    request: { status: string };
  }[],
) {
  const reserved = new Map<string, number>();
  for (const item of items) {
    if (!["PENDING", "APPROVED", "PROCESSING"].includes(item.request.status))
      continue;
    const quantity =
      item.request.status === "PENDING"
        ? item.quantity
        : (item.approvedQuantity ?? item.quantity);
    reserved.set(
      item.productId,
      (reserved.get(item.productId) ?? 0) + quantity,
    );
  }
  return reserved;
}

export async function canReserveStock(
  tx: Prisma.TransactionClient,
  warehouseId: string,
  items: { productId: string; quantity: number }[],
) {
  const ids = [...new Set(items.map((item) => item.productId))].sort();
  if (!ids.length) return false;
  // Both order entry points use the same row locks. Concurrent requests cannot
  // validate the same unreserved units before either request has committed.
  await tx.$queryRaw`SELECT "productId" FROM "WarehouseInventory"
    WHERE "warehouseId" = ${warehouseId} AND "productId" IN (${Prisma.join(ids)})
    ORDER BY "productId" FOR UPDATE`;
  const [stock, reserved] = await Promise.all([
    tx.warehouseInventory.findMany({
      where: { warehouseId, productId: { in: ids } },
    }),
    reservedStock(warehouseId, ids, tx),
  ]);
  const requested = new Map<string, number>();
  for (const item of items)
    requested.set(
      item.productId,
      (requested.get(item.productId) ?? 0) + item.quantity,
    );
  return [...requested].every(([id, quantity]) => {
    const row = stock.find((item) => item.productId === id);
    return row != null && row.quantity - (reserved.get(id) ?? 0) >= quantity;
  });
}
