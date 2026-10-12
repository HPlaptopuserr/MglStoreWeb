import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma, type Prisma } from "@mgl/database";
import { adjustStock, reconcilePhysicalStock, syncProductStock } from "./inventory.service";
import { ProductInventoryConflictError, resolveProductInventoryWarehouse } from "./vendor-inventory-warehouse.service";
import { assertWarehouseImportIdentity, WarehouseProductOwnershipError } from "./warehouse-product-ownership";

const url = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled = process.env.STORE_ISOLATION_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.startsWith("/wms_test_");

async function withRollback(run: (tx: Prisma.TransactionClient) => Promise<void>) {
  const rollback = new Error("TEST_ROLLBACK");
  try {
    await prisma.$transaction(async tx => { await run(tx); throw rollback; }, { timeout: 20000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

test("stale cross-owner movements and aggregations cannot recreate mixed stock", { skip: !enabled }, () => withRollback(async tx => {
  const key = randomUUID();
  const org = await tx.organization.create({ data: { name: key, slug: key, taxId: key } });
  const central = await tx.warehouse.create({ data: { name: key, address: "Test", type: "CENTRAL", organizations: { create: { organizationId: org.id } } } });
  const store = await tx.warehouse.create({ data: { name: key, address: "Test", type: "VENDOR_INTERNAL", organizations: { create: { organizationId: org.id } } } });
  const product = await tx.product.create({ data: { organizationId: org.id, name: key, price: 4800, stock: 6, warehouseInventories: { create: { warehouseId: store.id, quantity: 6 } } } });
  const source = { productId: product.id, warehouseId: central.id, change: 120, reason: "RESTOCK" as const };
  await assert.rejects(adjustStock(tx, source), WarehouseProductOwnershipError);
  assert.equal(await tx.warehouseInventory.count({ where: { warehouseId: central.id, productId: product.id } }), 0);
  // Simulate an older bad link: even the valid store operation must not aggregate it.
  await tx.warehouseInventory.create({ data: { warehouseId: central.id, productId: product.id, quantity: 120 } });
  await assert.rejects(adjustStock(tx, { ...source, warehouseId: store.id, change: -1 }), WarehouseProductOwnershipError);
  await assert.rejects(syncProductStock(tx, product.id), WarehouseProductOwnershipError);
  await assert.rejects(reconcilePhysicalStock(tx, { warehouseId: store.id, referenceId: key, createdById: key, lines: [{ productId: product.id, change: 1, note: "Test" }] }), WarehouseProductOwnershipError);
  assert.equal((await tx.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 6);
  assert.equal(await tx.inventoryLedger.count({ where: { productId: product.id } }), 0);
  await tx.warehouseInventory.delete({ where: { warehouseId_productId: { warehouseId: central.id, productId: product.id } } });
  await adjustStock(tx, { ...source, warehouseId: store.id, change: -1, reason: "ORDER" });
  assert.equal((await tx.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 5);
  await assert.rejects(adjustStock(tx, { productId: product.id, change: 1, reason: "RESTOCK" }), WarehouseProductOwnershipError);
}));

test("central-only legacy customer stock is neither adopted nor duplicated by import", { skip: !enabled }, () => withRollback(async tx => {
  const key = randomUUID();
  const org = await tx.organization.create({ data: { name: key, slug: key, taxId: key } });
  const warehouse = await tx.warehouse.create({ data: { name: key, address: "Test", type: "CENTRAL", organizations: { create: { organizationId: org.id } } } });
  const product = await tx.product.create({ data: { organizationId: org.id, name: key, sku: key, price: 1, stock: 120, warehouseInventories: { create: { warehouseId: warehouse.id, quantity: 120 } } } });
  await assert.rejects(resolveProductInventoryWarehouse(tx, org.id, product.id), ProductInventoryConflictError);
  await assert.rejects(assertWarehouseImportIdentity(tx, warehouse.id, { sku: key, name: "Renamed" }), WarehouseProductOwnershipError);
  await assert.rejects(assertWarehouseImportIdentity(tx, warehouse.id, { sku: null, name: key.toUpperCase() }), WarehouseProductOwnershipError);
  await assertWarehouseImportIdentity(tx, warehouse.id, { sku: `${key}-new`, name: `${key}-new` });
  assert.equal((await tx.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 120);
  assert.equal(await tx.warehouse.count({ where: { type: "VENDOR_INTERNAL", organizations: { some: { organizationId: org.id } } } }), 0);
}));

test("explicit shared catalog preserves its physical stock while rejecting unrelated recipients", { skip: !enabled }, () => withRollback(async tx => {
  const key = randomUUID();
  const org = await tx.organization.create({ data: { name: key, slug: key, taxId: key } });
  const recipient = await tx.organization.create({ data: { name: key, slug: `${key}-recipient`, taxId: `${key}-recipient` } });
  const warehouse = await tx.warehouse.create({ data: { name: key, address: "Test", type: "CENTRAL", catalogOrganizationId: org.id, organizations: { create: { organizationId: recipient.id } } } });
  const product = await tx.product.create({ data: { organizationId: org.id, name: key, price: 1, stock: 8 } });
  assert.equal(await resolveProductInventoryWarehouse(tx, org.id, product.id, null, true), warehouse.id);
  await adjustStock(tx, { productId: product.id, warehouseId: warehouse.id, change: -2, reason: "ORDER" });
  await assert.rejects(resolveProductInventoryWarehouse(tx, recipient.id, product.id), ProductInventoryConflictError);
  const current = await tx.product.findUniqueOrThrow({ where: { id: product.id } });
  assert.equal(current.stock, 6);
  assert.equal(current.organizationId, org.id);
  assert.equal(current.managedByWarehouseId, warehouse.id);
  assert.equal((await tx.warehouseInventory.findUniqueOrThrow({ where: { warehouseId_productId: { warehouseId: warehouse.id, productId: product.id } } })).quantity, 6);
}));

test("explicit legacy warehouse management stays usable centrally without granting vendor stock access", { skip: !enabled }, () => withRollback(async tx => {
  const key = randomUUID();
  const org = await tx.organization.create({ data: { name: key, slug: key, taxId: key } });
  const warehouse = await tx.warehouse.create({ data: { name: key, address: "Test", type: "CENTRAL" } });
  const product = await tx.product.create({ data: { organizationId: org.id, managedByWarehouseId: warehouse.id, name: key, sku: key, price: 1, stock: 120, warehouseInventories: { create: { warehouseId: warehouse.id, quantity: 120 } } } });
  await adjustStock(tx, { productId: product.id, warehouseId: warehouse.id, change: 5, reason: "RESTOCK" });
  await assertWarehouseImportIdentity(tx, warehouse.id, { sku: key, name: key });
  await assert.rejects(resolveProductInventoryWarehouse(tx, org.id, product.id), ProductInventoryConflictError);
  const current = await tx.product.findUniqueOrThrow({ where: { id: product.id } });
  assert.equal(current.stock, 125);
  assert.equal(current.organizationId, org.id);
}));
