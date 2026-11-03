import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { rankWarehouseProcurement, type RankedWarehouseItem } from './warehouse-procurement-ranking';

const item = (id: string, category: string, outgoing: number, quantity = 10): RankedWarehouseItem => ({
  productId: id, quantity, physicalQuantity: 10, reservedQuantity: 10 - quantity,
  outgoingQuantity90d: outgoing,
  product: { id, name: id, category: null, businessCategory: { id: category, name: category } },
});

test('ranks ten categories by all warehouse outgoing, not the first product page', () => {
  const items = Array.from({ length: 12 }, (_, index) => item(`product-${index}`, `category-${index}`, index + 1));
  const result = rankWarehouseProcurement(items);
  assert.equal(result.categories.length, 10);
  assert.equal(result.categories[0].id, 'business:category-11');
  assert.equal(result.selectedCategoryId, 'business:category-11');
  assert.equal(result.items[0].productId, 'product-11');
  assert.ok(!result.categories.some(category => category.id === 'business:category-0'));
});

test('ten-item pages preserve warehouse outgoing order with stable ties', () => {
  const items = Array.from({ length: 25 }, (_, index) => item(`p-${String(index).padStart(2, '0')}`, 'food', 100 - index));
  const first = rankWarehouseProcurement(items, 'business:food', 1);
  const second = rankWarehouseProcurement(items, 'business:food', 2);
  const last = rankWarehouseProcurement(items, 'business:food', 3);
  assert.equal(first.items.length, 10);
  assert.equal(second.items.length, 10);
  assert.equal(last.items.length, 5);
  assert.equal(first.items[0].productId, 'p-00');
  assert.equal(second.items[0].productId, 'p-10');
  assert.equal(last.hasMore, false);
  assert.equal(new Set([...first.items, ...second.items].map(row => row.productId)).size, 20);
  const ties = rankWarehouseProcurement([item('b', 'food', 10), item('a', 'food', 10)]);
  assert.equal(ties.items[0].productId, 'a');
});

test('reserved stock is excluded while available no-history products remain discoverable', () => {
  const result = rankWarehouseProcurement([
    item('fully-reserved', 'food', 1000, 0), item('no-history', 'drinks', 0),
    item('ready', 'food', 20),
  ]);
  assert.equal(result.total, 1);
  assert.equal(result.categories.length, 2);
  assert.equal(result.categories[0].outgoingQuantity90d, 20);
  assert.equal(result.items[0].productId, 'ready');
  assert.equal(rankWarehouseProcurement([]).selectedCategoryId, null);
});

test('category identity does not merge unrelated categories with identical names', () => {
  const legacy = item('legacy', 'food', 10);
  legacy.product.businessCategory = null;
  legacy.product.category = { id: 'food', name: 'food' };
  const result = rankWarehouseProcurement([item('modern', 'food', 20), legacy], 'catalog:food');
  assert.equal(result.categories.length, 2);
  assert.deepEqual(result.items.map(row => row.productId), ['legacy']);
});
