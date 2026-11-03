import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import type { Prisma } from '@mgl/database';
import { readWarehouseProcurement } from './warehouse-procurement.service';

function dependencies() {
  const db = {
    inventoryLedger: {
      groupBy: async (args: Prisma.InventoryLedgerGroupByArgs) => {
        assert.equal(args.where?.warehouseId, 'warehouse');
        assert.deepEqual(args.where?.reason, { in: ['ORDER', 'TRANSFER_OUT'] });
        assert.deepEqual(args.where?.change, { lt: 0 });
        assert.ok(args.where?.createdAt);
        return [{ productId: 'ready', _sum: { change: -60 } }, { productId: 'reserved', _sum: { change: -100 } }];
      },
    },
    warehouseInventory: {
      findMany: async (args: Prisma.WarehouseInventoryFindManyArgs) => {
        assert.equal(args.where?.warehouseId, 'warehouse');
        assert.deepEqual(args.where?.product, { deletedAt: null, isActive: true });
        return ['ready', 'reserved'].map(id => ({ productId: id, quantity: 20,
          product: { id, name: id, unit: 'pcs', price: 3000, sku: null, barcode: null,
            images: [], category: null, businessCategory: { id: 'food', name: 'Хүнс' } } }));
      },
    },
    warehouseStockRequestItem: {
      findMany: async (args: Prisma.WarehouseStockRequestItemFindManyArgs) => {
        assert.equal((args.where?.request as Prisma.WarehouseStockRequestWhereInput).warehouseId, 'warehouse');
        return [{ productId: 'reserved', quantity: 20, approvedQuantity: 20, request: { status: 'APPROVED', dispatch: null } }];
      },
    },
    warehouseRetailOrderItem: { findMany: async () => [] },
  } as unknown as Prisma.TransactionClient;
  return { db, buildAdvice: async () => ({ mode: 'smart' as const, summary: '', suggestions: [] }) };
}

test('uses actual outgoing ledger in the chosen warehouse and excludes fully reserved inventory', async () => {
  const page = await readWarehouseProcurement('warehouse', undefined, 1, dependencies());
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].productId, 'ready');
  assert.equal(page.items[0].outgoingQuantity90d, 60);
  assert.equal(page.items[0].suggestedQuantity, 1);
  assert.equal(page.categories[0].productCount, 1);
  assert.equal(page.mode, 'smart');
});

test('warehouse demand does not masquerade as the store personal sales history', async () => {
  const deps = dependencies();
  const page = await readWarehouseProcurement('warehouse', undefined, 1, { ...deps,
    buildAdvice: async candidates => {
      assert.equal(candidates[0].soldQuantity90d, 0);
      assert.equal(candidates[0].warehouseOutgoingQuantity90d, 60);
      return { mode: 'ai', summary: 'AI', suggestions: [{ productId: 'ready', quantity: 1, reason: 'Эрэлттэй бараа' }] };
    },
  });
  assert.equal(page.mode, 'ai');
  assert.equal(page.items[0].reason, 'Эрэлттэй бараа');
});

test('no outgoing history still recommends warehouse inventory', async () => {
  const deps = dependencies();
  const db = { ...deps.db,
    inventoryLedger: { groupBy: async () => [] },
  } as unknown as Prisma.TransactionClient;
  const page = await readWarehouseProcurement('warehouse', undefined, 1, { ...deps, db });
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].productId, 'ready');
  assert.equal(page.items[0].outgoingQuantity90d, 0);
  assert.equal(page.items[0].suggestedQuantity, 1);
  assert.equal(page.hasMore, false);
});
