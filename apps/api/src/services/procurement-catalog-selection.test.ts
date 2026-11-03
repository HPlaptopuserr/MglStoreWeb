import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { selectProcurementCatalog } from './procurement-catalog-selection';
const product = (id: string, sales = 0, outgoing = 0, quantity = 10) => ({
  id, quantity, soldQuantity90d: sales, outgoingQuantity90d: outgoing,
  reorderPoint: 0, organizationStock: 0, previouslyRequestedQuantity: 0,
  recommendationReason: null as string | null,
});
test('best sellers use the stores own sales before warehouse popularity', () => {
  const result = selectProcurementCatalog([product('own', 5), product('warehouse', 0, 900)], 'topSelling', false);
  assert.equal(result.source, 'store');
  assert.deepEqual(result.items.map(item => item.id), ['own']);
});
test('a store without sales gets available warehouse products and outgoing rankings', () => {
  const result = selectProcurementCatalog([product('popular', 0, 900), product('new'), product('reserved', 0, 1000, 0)], 'topSelling', false);
  assert.equal(result.source, 'warehouse');
  assert.deepEqual(result.items.map(item => item.id), ['popular', 'new']);
  assert.equal(result.items[0].recommendationReason, 'WAREHOUSE_POPULAR');
  assert.equal(result.items[1].recommendationReason, 'AVAILABLE_STOCK');
});
test('even without any history or reorder settings ready warehouse stock is shown', () => {
  for (const sort of ['topSelling', 'recommended', 'previouslyOrdered', 'mostRequested']) {
    const result = selectProcurementCatalog([product('ready'), product('sold-out', 0, 0, 0)], sort, false);
    assert.equal(result.source, 'catalog');
    assert.deepEqual(result.items.map(item => item.id), ['ready']);
  }
  const replenish = selectProcurementCatalog([product('ready')], 'name', true);
  assert.equal(replenish.items.length, 1);
});
test('a real empty warehouse remains empty and all-products browsing keeps sold-out rows', () => {
  assert.equal(selectProcurementCatalog([], 'recommended', false).items.length, 0);
  const result = selectProcurementCatalog([product('sold-out', 0, 0, 0)], 'name', false);
  assert.equal(result.items.length, 1);
});
test('clients that do not request store-first demand retain their original sales filter', () => {
  const inventory = [{ ...product('own', 5), systemSoldQuantity90d: 0 },
    { ...product('system', 0, 900), systemSoldQuantity90d: 900 }];
  const result = selectProcurementCatalog(inventory, 'topSelling', false, false);
  assert.deepEqual(result.items.map(item => item.id), ['system']);
  assert.equal(selectProcurementCatalog([product('ready')], 'topSelling', false, false).items.length, 0);
});
