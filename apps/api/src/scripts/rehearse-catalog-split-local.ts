import "../config/env";
import assert from "node:assert/strict";
import { prisma } from "@mgl/database";
import { splitVendorWarehouseCatalog } from "../services/warehouse-catalog/split-catalog";
async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "http://disabled");
  if (url.hostname !== "127.0.0.1" || url.port !== "55437" || url.pathname !== "/catalog_copy") throw new Error("Rehearsal requires disposable catalog_copy on port 55437");
  const before = await prisma.product.findMany({ orderBy: { id: "asc" } });
  const inventories = await prisma.warehouseInventory.findMany({ orderBy: { id: "asc" } });
  const orders = await prisma.orderItem.findMany({ orderBy: { id: "asc" } });
  const sales = await prisma.posSaleLine.findMany({ orderBy: { id: "asc" } });
  const candidates = await prisma.product.findMany({ where: { organizationId: { not: null }, OR: [{ managedByWarehouseId: { not: null } }, { warehouseInventories: { some: { warehouse: { type: "CENTRAL" } } } }] }, distinct: ["organizationId"], select: { organizationId: true } });
  const reports = [];
  for (const candidate of candidates) if (candidate.organizationId) {
    const preview = await splitVendorWarehouseCatalog({ organizationId: candidate.organizationId });
    assert.deepEqual(preview.blockers, []);
    reports.push(await splitVendorWarehouseCatalog({ organizationId: candidate.organizationId, apply: true, expectedFingerprint: preview.fingerprint }));
  }
  const after = await prisma.product.findMany({ where: { id: { in: before.map(p => p.id) } }, orderBy: { id: "asc" } });
  const business = (rows: typeof before) => rows.map(({ managedByWarehouseId: _manager, ...row }) => row);
  assert.deepEqual(business(after), business(before));
  const inventoryAfter = await prisma.warehouseInventory.findMany({ where: { id: { in: inventories.map(i => i.id) } }, orderBy: { id: "asc" } });
  const physical = (rows: typeof inventories) => rows.map(({ productId: _product, updatedAt: _date, ...row }) => row);
  assert.deepEqual(physical(inventoryAfter), physical(inventories));
  assert.deepEqual(await prisma.orderItem.findMany({ orderBy: { id: "asc" } }), orders);
  assert.deepEqual(await prisma.posSaleLine.findMany({ orderBy: { id: "asc" } }), sales);
  const mixed = await prisma.product.count({ where: { organizationId: { not: null }, managedByWarehouseId: { not: null }, deletedAt: null } });
  const sharedInventory = await prisma.warehouseInventory.count({ where: { warehouse: { type: "CENTRAL" }, product: { organizationId: { not: null }, deletedAt: null } } });
  assert.equal(mixed, 0);
  assert.equal(sharedInventory, 0);
  console.log(JSON.stringify({ reports, verifiedOriginalProducts: before.length, verifiedInventoryRows: inventories.length,
    preservedOrderItems: orders.length, preservedSaleLines: sales.length, mixed, sharedInventory, passed: true }, null, 2));
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
