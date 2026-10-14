import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "@mgl/database";
import { splitVendorWarehouseCatalog } from "./split-catalog";
import { adjustStock, resolveOrgWarehouse } from "../inventory.service";
const enabled = process.env.CATALOG_SPLIT_LOCAL_TEST === "1" && new URL(process.env.DATABASE_URL ?? "http://disabled").hostname === "127.0.0.1";
test("split preserves both baselines and routes warehouse receipt, return and vendor sale independently", { skip: !enabled }, async () => {
  const key = randomUUID();
  const org = await prisma.organization.create({ data: { name: key, slug: key, taxId: key } });
  const user = await prisma.user.create({ data: { email: `${key}@example.invalid` } });
  const warehouse = await prisma.warehouse.create({ data: { name: "Central", address: "Local", catalogOrganizationId: org.id } });
  let auditId: string | null = null;
  try {
    const product = await prisma.product.create({ data: { organizationId: org.id, managedByWarehouseId: warehouse.id,
      name: "Preserved product", sku: "SKU-001", barcode: "0012345", barcodeAliases: ["0006789"], price: 4800, stock: 100 } });
    const originalInventory = await prisma.warehouseInventory.create({ data: { warehouseId: warehouse.id, productId: product.id, quantity: 80, batchNumber: "LOT-1" } });
    const receipt = await prisma.warehouseGoodsReceipt.create({ data: { receiptNumber: key, warehouseId: warehouse.id, supplierName: "Test", createdById: user.id,
      status: "CONFIRMED", items: { create: { productId: product.id, quantity: 10, unitCost: 100 } } }, include: { items: true } });
    const historicalMovement = await prisma.inventoryLedger.create({ data: { productId: product.id, warehouseId: warehouse.id, change: 80, reason: "MANUAL_ADJUST", note: "Original warehouse history" } });
    const vendorMovement = await prisma.inventoryLedger.create({ data: { productId: product.id, change: 100, reason: "MANUAL_ADJUST" } });
    const plan = await splitVendorWarehouseCatalog({ organizationId: org.id });
    assert.deepEqual(plan.blockers, []);
    const result = await splitVendorWarehouseCatalog({ organizationId: org.id, apply: true, expectedFingerprint: plan.fingerprint });
    auditId = result.auditId;
    assert.ok(auditId);
    assert.deepEqual(await prisma.product.findUniqueOrThrow({ where: { id: product.id } }), { ...product, managedByWarehouseId: null });
    const warehouseInventory = await prisma.warehouseInventory.findUniqueOrThrow({ where: { id: originalInventory.id } });
    assert.equal(warehouseInventory.quantity, 80);
    assert.equal(warehouseInventory.batchNumber, "LOT-1");
    assert.notEqual(warehouseInventory.productId, product.id);
    const clone = await prisma.product.findUniqueOrThrow({ where: { id: warehouseInventory.productId } });
    assert.equal(clone.organizationId, null);
    assert.equal(clone.managedByWarehouseId, warehouse.id);
    assert.equal(clone.barcode, product.barcode);
    assert.equal(clone.stock, 80);
    assert.deepEqual(await prisma.inventoryLedger.findUniqueOrThrow({ where: { id: historicalMovement.id } }), { ...historicalMovement, productId: clone.id });
    assert.deepEqual(await prisma.inventoryLedger.findUniqueOrThrow({ where: { id: vendorMovement.id } }), vendorMovement);
    const item = await prisma.warehouseGoodsReceiptItem.findUniqueOrThrow({ where: { id: receipt.items[0].id } });
    assert.equal(item.productId, clone.id);
    assert.equal(item.quantity, 10);
    assert.equal(item.receiptId, receipt.id);
    await prisma.$transaction(tx => adjustStock(tx, { productId: clone.id, warehouseId: warehouse.id, change: -10, reason: "MANUAL_ADJUST", referenceType: "WAREHOUSE_GOODS_RECEIPT_CANCELLATION", referenceId: receipt.id }));
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 100);
    await prisma.$transaction(async tx => {
      const warehouseId = await resolveOrgWarehouse(tx, org.id, product.id);
      await adjustStock(tx, { productId: product.id, warehouseId: warehouseId ?? undefined, change: -2, reason: "ORDER" });
    });
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: clone.id } })).stock, 70);
    await prisma.$transaction(tx => adjustStock(tx, { productId: clone.id, warehouseId: warehouse.id, change: 3, reason: "RETURN" }));
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 98);
    const retry = await splitVendorWarehouseCatalog({ organizationId: org.id });
    assert.equal(retry.products, 0);
    assert.equal((await splitVendorWarehouseCatalog({ organizationId: org.id, apply: true, expectedFingerprint: retry.fingerprint })).applied, false);
    await assert.rejects(prisma.$transaction(tx => adjustStock(tx, { productId: product.id, warehouseId: warehouse.id, change: 1, reason: "RETURN" })), /эзэмшил/);
  } finally {
    const where = { OR: [{ organizationId: org.id }, { managedByWarehouseId: warehouse.id }] };
    await prisma.warehouseGoodsReceipt.deleteMany({ where: { warehouseId: warehouse.id } });
    await prisma.inventoryLedger.deleteMany({ where: { product: where } });
    await prisma.warehouseInventory.deleteMany({ where: { product: where } });
    await prisma.product.deleteMany({ where });
    const targets = await prisma.warehouse.findMany({ where: { organizations: { some: { organizationId: org.id } } }, select: { id: true } });
    await prisma.warehouseOrganization.deleteMany({ where: { organizationId: org.id } });
    await prisma.warehouse.deleteMany({ where: { id: { in: [warehouse.id, ...targets.map(w => w.id)] } } });
    if (auditId) await prisma.auditLog.deleteMany({ where: { meta: { path: ["auditId"], equals: auditId } } });
    if (auditId) await prisma.auditLog.delete({ where: { id: auditId } });
    await prisma.organization.delete({ where: { id: org.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});
