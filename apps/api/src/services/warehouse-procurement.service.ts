import { prisma, type Prisma } from '@mgl/database';
import { fromPosStoredStockQuantity } from '@mgl/types';
import { reservedStock, stockAvailability } from './stock-reservation.service';
import { rankWarehouseProcurement } from './warehouse-procurement-ranking';
import { buildProcurementAdvice } from './procurement-ai.service';

/** Caller must verify REQUEST_STOCK and procurement access to this warehouse. */
export async function readWarehouseProcurement(
  warehouseId: string, categoryId: string | undefined, page: number,
  dependencies: { db: Prisma.TransactionClient; buildAdvice: typeof buildProcurementAdvice } = {
    db: prisma, buildAdvice: buildProcurementAdvice,
  },
) {
  const { db, buildAdvice } = dependencies;
  const since = new Date();
  since.setDate(since.getDate() - 90);
  // Actual warehouse sales and dispatches, not pending requests or system-wide sales.
  const movements = await db.inventoryLedger.groupBy({
    by: ['productId'],
    where: { warehouseId, createdAt: { gte: since }, change: { lt: 0 },
      reason: { in: ['ORDER', 'TRANSFER_OUT'] } },
    _sum: { change: true },
  });
  const outgoing = new Map(movements.map(row => [row.productId, -(row._sum.change ?? 0)]));
  const inventory = await db.warehouseInventory.findMany({
    where: { warehouseId, quantity: { gt: 0 },
      product: { deletedAt: null, isActive: true } },
    select: {
      productId: true, quantity: true,
      product: { select: {
        id: true, name: true, sku: true, barcode: true, unit: true, price: true,
        images: { take: 1, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], select: { url: true } },
        businessCategory: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      } },
    },
  });
  const reserved = inventory.length ? await reservedStock(warehouseId, inventory.map(item => item.productId), db) : new Map<string, number>();
  const ranked = rankWarehouseProcurement(inventory.map(item => ({
    ...item, ...stockAvailability(item.quantity, reserved.get(item.productId) ?? 0),
    outgoingQuantity90d: fromPosStoredStockQuantity(outgoing.get(item.productId) ?? 0, item.product.unit),
  })), categoryId, page);
  const advice = await buildAdvice(ranked.items.map(item => ({
    productId: item.productId, name: item.product.name, availableStock: item.quantity,
    organizationStock: 0, reorderPoint: 0, soldQuantity90d: 0,
    systemRequestedQuantity90d: 0, previouslyRequestedQuantity: 0,
    warehouseOutgoingQuantity90d: item.outgoingQuantity90d,
  })));
  const suggestions = new Map(advice.suggestions.map(item => [item.productId, item]));
  return {
    ...ranked, mode: advice.mode,
    summary: ranked.items.some(item => item.outgoingQuantity90d > 0)
      ? 'Агуулахын их гардаг бараанаас санал болголоо. Татан авах тоогоо сонгоно уу.'
      : 'Агуулахад бэлэн бараанаас санал болголоо. Татан авах тоогоо сонгоно уу.',
    items: ranked.items.map(item => ({
      ...item,
      suggestedQuantity: Math.min(item.quantity, suggestions.get(item.productId)?.quantity ?? 1),
      reason: suggestions.get(item.productId)?.reason ?? (item.outgoingQuantity90d > 0 ? 'Агуулахын эрэлттэй бараа' : 'Агуулахад бэлэн'),
    })),
  };
}
