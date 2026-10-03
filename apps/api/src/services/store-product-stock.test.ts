import assert from 'node:assert/strict';
import test from 'node:test';
import { onlineProductStock } from './store-product-stock';

test('Hypermarket stock cannot be substituted by another warehouse', () => {
  assert.equal(onlineProductStock({ managedByWarehouseId: 'hypermarket', stock: 102, warehouseInventories: [{ warehouseId: 'other', quantity: 100 }, { warehouseId: 'hypermarket', quantity: 2 }] }), 2);
  assert.equal(onlineProductStock({ managedByWarehouseId: 'hypermarket', stock: 100, warehouseInventories: [{ warehouseId: 'other', quantity: 100 }] }), 0);
});
test('ordinary store inventory keeps its existing stock calculation', () => {
  assert.equal(onlineProductStock({ managedByWarehouseId: null, stock: 8, warehouseInventories: [] }), 8);
});
