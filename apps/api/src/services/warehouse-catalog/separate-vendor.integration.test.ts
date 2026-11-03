import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "@mgl/database";
import { separateVendorCatalog, rollbackVendorSeparation } from "./separate-vendor";
import { adjustStock, resolveOrgWarehouse } from "../inventory.service";

const enabled = process.env.CATALOG_SEPARATION_LOCAL_TEST === "1" &&
  new URL(process.env.DATABASE_URL ?? "http://disabled").hostname === "127.0.0.1";

test("local separation preserves product identity, inventory metadata, order history and foreign catalogs; rollback and stale plan are guarded", { skip: !enabled }, async () => {
  const key = randomUUID();
  const org = await prisma.organization.create({ data: { name: `Vendor ${key}`, slug: key, taxId: key } });
  const other = await prisma.organization.create({ data: { name: "Other vendor", slug: `${key}-other`, taxId: `${key}-other` } });
  const user = await prisma.user.create({ data: { email: `${key}@example.invalid` } });
  const source = await prisma.warehouse.create({ data: { name: "Central", address: "Local test", catalogOrganizationId: org.id,
    organizations: { create: [{ organizationId: org.id }, { organizationId: other.id }] } } });
  let auditIds: string[] = [];
  try {
    const product = await prisma.product.create({ data: { organizationId: org.id, managedByWarehouseId: source.id,
      name: "Mgl Cafe Latte aygagvi", sku: `MCL-${key}`, barcode: "0012345678901", barcodeAliases: ["0012345678902"], price: 4800, costPrice: 3200, stock: 100,
      images: { create: { url: "https://example.invalid/product.png" } } } });
    const foreign = await prisma.product.create({ data: { organizationId: other.id, name: product.name, price: 5500, stock: 87 } });
    const central = await prisma.product.create({ data: { managedByWarehouseId: source.id, name: "Warehouse only", price: 100, stock: 11 } });
    const inventory = await prisma.warehouseInventory.create({ data: { productId: product.id, warehouseId: source.id,
      quantity: 100, batchNumber: "LOT-A", expiryDate: new Date("2027-01-01"), minQuantity: 3, location: "A1" } });
    const centralInventory = await prisma.warehouseInventory.create({ data: { productId: central.id, warehouseId: source.id, quantity: 11 } });
    const order = await prisma.order.create({ data: { organizationId: org.id, customerId: user.id, shippingAddress: "Test", phone: "00000000",
      orderNumber: key, subtotal: 4800, total: 4800, items: { create: { productId: product.id, productName: product.name, productSku: product.sku, quantity: 1, price: 4800, subtotal: 4800 } } }, include: { items: true } });
    const images = await prisma.productImage.findMany({ where: { productId: product.id } });
    // Unsafe plans must fail without clearing links or partially moving stock.
    await prisma.warehouseInventory.update({ where: { id: inventory.id }, data: { quantity: 99 } });
    const mismatch = await separateVendorCatalog({ organizationId: org.id });
    assert.ok(mismatch.blockers.some(reason => reason.includes("stock differ")));
    await assert.rejects(separateVendorCatalog({ organizationId: org.id, apply: true, expectedFingerprint: mismatch.fingerprint }), /stock differ/);
    assert.deepEqual(await prisma.product.findUniqueOrThrow({ where: { id: product.id } }), product);
    await prisma.warehouseInventory.update({ where: { id: inventory.id }, data: { quantity: 100, updatedAt: inventory.updatedAt } });
    const receipt = await prisma.warehouseGoodsReceipt.create({ data: {
      receiptNumber: key, warehouseId: source.id, supplierName: "Test", createdById: user.id,
      items: { create: { productId: product.id, quantity: 100, unitCost: 3200 } },
    } });
    const documents = await separateVendorCatalog({ organizationId: org.id });
    assert.ok(documents.blockers.some(reason => reason.includes("warehouse documents")));
    await assert.rejects(separateVendorCatalog({ organizationId: org.id, apply: true, expectedFingerprint: documents.fingerprint }), /warehouse documents/);
    assert.equal(await prisma.auditLog.count({ where: { meta: { path: ["report", "organizationId"], equals: org.id } } }), 0);
    await prisma.warehouseGoodsReceipt.delete({ where: { id: receipt.id } });
    const preview = await separateVendorCatalog({ organizationId: org.id });
    assert.deepEqual(preview.blockers, []);
    assert.equal(preview.applied, false);
    assert.deepEqual(await prisma.product.findUniqueOrThrow({ where: { id: product.id } }), product);
    const result = await separateVendorCatalog({ organizationId: org.id, apply: true, expectedFingerprint: preview.fingerprint });
    assert.ok(result.applied && result.auditId && result.targetId);
    auditIds.push(result.auditId);
    assert.deepEqual(await prisma.product.findUniqueOrThrow({ where: { id: product.id } }), { ...product, managedByWarehouseId: null });
    const moved = await prisma.warehouseInventory.findUniqueOrThrow({ where: { id: inventory.id } });
    assert.deepEqual({ ...moved, warehouseId: inventory.warehouseId, updatedAt: inventory.updatedAt }, inventory);
    assert.equal(moved.warehouseId, result.targetId);
    assert.deepEqual(await prisma.product.findUniqueOrThrow({ where: { id: foreign.id } }), foreign);
    assert.deepEqual(await prisma.product.findUniqueOrThrow({ where: { id: central.id } }), central);
    assert.deepEqual(await prisma.warehouseInventory.findUniqueOrThrow({ where: { id: centralInventory.id } }), centralInventory);
    assert.deepEqual(await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } }), order);
    assert.deepEqual(await prisma.productImage.findMany({ where: { productId: product.id } }), images);
    const repeated = await separateVendorCatalog({ organizationId: org.id });
    assert.deepEqual(repeated.affectedProductIds, []);
    assert.equal((await separateVendorCatalog({ organizationId: org.id, apply: true, expectedFingerprint: repeated.fingerprint })).applied, false);
    await rollbackVendorSeparation(result.auditId);
    assert.deepEqual(await prisma.product.findUniqueOrThrow({ where: { id: product.id } }), product);
    assert.deepEqual(await prisma.warehouseInventory.findUniqueOrThrow({ where: { id: inventory.id } }), inventory);
    assert.equal((await prisma.warehouse.findUniqueOrThrow({ where: { id: source.id } })).catalogOrganizationId, org.id);
    assert.equal((await rollbackVendorSeparation(result.auditId)).alreadyRestored, true);
    const stale = await separateVendorCatalog({ organizationId: org.id });
    await prisma.product.update({ where: { id: product.id }, data: { price: 4801 } });
    await assert.rejects(separateVendorCatalog({ organizationId: org.id, apply: true, expectedFingerprint: stale.fingerprint }), /changed since preview/);
    const next = await separateVendorCatalog({ organizationId: org.id });
    const migrated = await separateVendorCatalog({ organizationId: org.id, apply: true, expectedFingerprint: next.fingerprint });
    assert.ok(migrated.auditId);
    auditIds.push(migrated.auditId);
    await prisma.$transaction(async tx => {
      const warehouseId = await resolveOrgWarehouse(tx, org.id, product.id);
      await adjustStock(tx, { productId: product.id, warehouseId: warehouseId ?? undefined, change: -1, reason: "ORDER" });
    });
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 99);
    await assert.rejects(rollbackVendorSeparation(migrated.auditId), /changed after separation/);
    assert.deepEqual(await prisma.warehouseInventory.findUniqueOrThrow({ where: { id: centralInventory.id } }), centralInventory);
    const backup = await prisma.auditLog.findUniqueOrThrow({ where: { id: migrated.auditId } });
    assert.ok(backup.meta);
  } finally {
    const productWhere = { OR: [{ organizationId: { in: [org.id, other.id] } }, { managedByWarehouseId: source.id }] };
    await prisma.warehouseGoodsReceipt.deleteMany({ where: { warehouseId: source.id } });
    await prisma.orderItem.deleteMany({ where: { order: { organizationId: org.id } } });
    await prisma.order.deleteMany({ where: { organizationId: org.id } });
    await prisma.inventoryLedger.deleteMany({ where: { product: productWhere } });
    await prisma.warehouseInventory.deleteMany({ where: { product: productWhere } });
    await prisma.productImage.deleteMany({ where: { product: productWhere } });
    await prisma.product.deleteMany({ where: productWhere });
    const warehouses = await prisma.warehouse.findMany({ where: { organizations: { some: { organizationId: { in: [org.id, other.id] } } } }, select: { id: true } });
    await prisma.warehouseOrganization.deleteMany({ where: { warehouseId: { in: warehouses.map(w => w.id) } } });
    await prisma.warehouse.deleteMany({ where: { id: { in: warehouses.map(w => w.id) } } });
    await prisma.auditLog.deleteMany({ where: { id: { in: auditIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: [org.id, other.id] } } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});
