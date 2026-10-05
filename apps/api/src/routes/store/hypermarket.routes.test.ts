import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { prisma } from '@mgl/database';
import router from './hypermarket.routes';

let server: Server, url: string;
const restores: Array<() => void> = [];
function stub(target: object, key: string, replacement: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, replacement);
  restores.push(() => { Reflect.set(target, key, previous); });
}
before(async () => {
  const app = express(); app.use(router);
  server = await new Promise<Server>(resolve => { const started = app.listen(0, '127.0.0.1', () => resolve(started)); });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/store/hypermarket/products`;
});
after(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
afterEach(() => { while (restores.length) restores.pop()?.(); });
beforeEach(() => {
  stub(prisma.warehouse, 'findMany', async () => [{ id: 'hypermarket', name: 'Hypermarket' }]);
  stub(prisma.siteSetting, 'findUnique', async () => ({ value: 'true' }));
  stub(prisma.siteSetting, 'findMany', async () => [{ key: 'web-products-enabled-public-org', value: 'true' }]);
  stub(prisma.organization, 'findMany', async () => [{ id: 'public-org' }]);
  stub(prisma.warehouseInventory, 'count', async () => 1);
  stub(prisma.warehouseStockRequestItem, 'findMany', async () => []);
});
test('guests can browse only published Hypermarket stock with no employee permission', async () => {
  stub(prisma.warehouseInventory, 'findMany', async ({ where, select }: { where: { warehouseId: string; product: { managedByWarehouseId: string; organizationId: { in: string[] }; isActive: boolean } }; select: { product: { select: Record<string, unknown> } } }) => {
    assert.equal(where.warehouseId, 'hypermarket');
    assert.equal(where.product.managedByWarehouseId, 'hypermarket');
    assert.deepEqual(where.product.organizationId.in, ['public-org']);
    assert.equal(where.product.isActive, true);
    assert.equal(select.product.select.costPrice, undefined);
    return [{ productId: 'milk', quantity: 7, product: { id: 'milk', name: 'Milk', price: 4500, unit: 'pcs', images: [] } }];
  });
  const response = await fetch(url);
  assert.equal(response.status, 200);
  const data = await response.json() as { products: Array<{ id: string; stock: number }> };
  assert.equal(data.products[0].id, 'milk'); assert.equal(data.products[0].stock, 7);
});
test('missing or duplicate warehouse never falls back to unrelated products', async () => {
  stub(prisma.warehouse, 'findMany', async () => []);
  assert.equal((await fetch(url)).status, 404);
  stub(prisma.warehouse, 'findMany', async () => [{ id: 'a' }, { id: 'b' }]);
  assert.equal((await fetch(url)).status, 409);
});
test('disabled public storefront does not expose operational inventory', async () => {
  stub(prisma.siteSetting, 'findUnique', async () => ({ value: 'false' }));
  const response = await fetch(url);
  assert.deepEqual((await response.json() as { products: unknown[] }).products, []);
});

test('Hypermarket allows missing photos but keeps inventory publication controls', async () => {
  stub(prisma.warehouseInventory, 'findMany', async ({where}: {where: {showOnWeb: boolean; quantity: unknown; product: Record<string, unknown>}}) => {
    assert.equal(where.showOnWeb, true);
    assert.deepEqual(where.quantity, {gt: 0});
    assert.equal(where.product.images, undefined);
    assert.deepEqual(where.product.price, {gte: 100});
    return [{productId: 'no-photo', quantity: 2, product: {id: 'no-photo', name: 'Milk', unit: 'pcs', price: 4500, images: []}}];
  });
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json() as {products: Array<{images: unknown[]}>}).products[0].images, []);
});
