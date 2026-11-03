import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import stockRequests from "./stock-requests.routes";
import posCatalog from "./pos/catalog.routes";
import { mutateStocktake } from "../../services/stocktake.service";

const databaseUrl = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled = process.env.STOCK_LIFECYCLE_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(databaseUrl.hostname) &&
  databaseUrl.pathname.startsWith("/wms_test_");

test("concurrent dispatch confirmation/cancellation, legacy completion and POS void change stock once", { skip: !enabled }, async (t) => {
  const key = randomUUID();
  const organization = await prisma.organization.create({ data: { name: "Lifecycle test", slug: key, taxId: key } });
  const actor = await prisma.user.create({ data: { email: `${key}@test.invalid`, role: "ADMIN" } });
  const branch = await prisma.branch.create({ data: { organizationId: organization.id, name: "Test", address: "Test" } });
  const warehouses = await Promise.all([
    prisma.warehouse.create({ data: { name: "Central", address: "Test", type: "CENTRAL" } }),
    prisma.warehouse.create({ data: { name: "Store", address: "Test", type: "VENDOR_INTERNAL", organizations: { create: { organizationId: organization.id } } } }),
  ]);
  const [central, store] = warehouses;
  const source = await prisma.product.create({ data: { name: "Source", barcode: key, managedByWarehouseId: central.id, price: 100, costPrice: 80, stock: 20 } });
  const destination = await prisma.product.create({ data: { name: "Store product", barcode: key, organizationId: organization.id, price: 150, costPrice: 90, stock: 5 } });
  const voidProduct = await prisma.product.create({ data: { name: "Void product", organizationId: organization.id, price: 150, costPrice: 100, stock: 8, unit: "pcs" } });
  const productIds = [source.id, destination.id, voidProduct.id];
  await prisma.warehouseInventory.createMany({ data: [
    { warehouseId: central.id, productId: source.id, quantity: 20 },
    { warehouseId: store.id, productId: destination.id, quantity: 5 },
    { warehouseId: store.id, productId: voidProduct.id, quantity: 8 },
  ] });
  const app = express();
  app.use(express.json(), stockRequests, posCatalog);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const token = jwt.sign({ userId: actor.id, role: "ADMIN" }, process.env.JWT_SECRET || "dev-secret-change-me");
  const call = (path: string, method = "PATCH", body: object = {}) => fetch(`${base}${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  t.after(async () => {
    server.close();
    await prisma.posGoodsReceiptAllocation.deleteMany({ where: { receiptItem: { productId: { in: productIds } } } });
    await prisma.posGoodsReceipt.deleteMany({ where: { organizationId: organization.id } });
    await prisma.posSale.deleteMany({ where: { organizationId: organization.id } });
    await prisma.posShift.deleteMany({ where: { organizationId: organization.id } });
    await prisma.posRegister.deleteMany({ where: { organizationId: organization.id } });
    await prisma.delivery.deleteMany({ where: { warehouseId: central.id } });
    await prisma.stockDispatch.deleteMany({ where: { organizationId: organization.id } });
    await prisma.warehouseStockRequest.deleteMany({ where: { organizationId: organization.id } });
    await prisma.stocktake.deleteMany({ where: { organizationId: organization.id } });
    await prisma.inventoryLedger.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.warehouseInventory.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.warehouseOrganization.deleteMany({ where: { organizationId: organization.id } });
    await prisma.warehouse.deleteMany({ where: { id: { in: warehouses.map(warehouse => warehouse.id) } } });
    await prisma.branch.deleteMany({ where: { organizationId: organization.id } });
    await prisma.auditLog.deleteMany({ where: { userId: actor.id } });
    await prisma.organization.delete({ where: { id: organization.id } });
    await prisma.user.delete({ where: { id: actor.id } });
  });

  async function request(quantity: number, suffix: string) {
    return prisma.warehouseStockRequest.create({ data: {
      requestNumber: `${key}-${suffix}`, organizationId: organization.id, warehouseId: central.id,
      requestedById: actor.id, status: "APPROVED",
      items: { create: { productId: source.id, quantity, approvedQuantity: quantity } },
    } });
  }
  async function concurrentPair(path: string, body: object = {}, method = "PATCH") {
    const responses = await Promise.all([call(path, method, body), call(path, method, body)]);
    const statuses = responses.map(response => response.status).sort();
    assert.equal(statuses.filter(status => status === 200).length, 1, JSON.stringify(await Promise.all(responses.map(response => response.text()))));
    assert.ok(statuses.some(status => status === 400 || status === 409), statuses.join(","));
  }
  const dispatchedRequest = await request(3, "dispatch");
  const dispatch = await prisma.stockDispatch.create({ data: {
    dispatchNumber: `${key}-dispatch`, requestId: dispatchedRequest.id, warehouseId: central.id, organizationId: organization.id,
  } });
  await concurrentPair(`/stock-requests/dispatches/${dispatch.id}/confirm`);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: source.id } })).stock, 17);
  assert.equal(await prisma.inventoryLedger.count({ where: { productId: source.id, referenceId: dispatchedRequest.id, change: -3 } }), 1);
  await concurrentPair(`/stock-requests/dispatches/${dispatch.id}/cancel`, { note: "Test cancellation" });
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: source.id } })).stock, 20);
  assert.equal(await prisma.inventoryLedger.count({ where: { productId: source.id, referenceId: dispatchedRequest.id, change: 3 } }), 1);

  const legacyRequest = await request(2, "legacy");
  await concurrentPair(`/stock-requests/${legacyRequest.id}/complete`);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: source.id } })).stock, 18);
  const received = await prisma.product.findUniqueOrThrow({ where: { id: destination.id } });
  assert.equal(received.stock, 7);
  assert.equal(Number(received.price), 150);
  assert.equal(Number(received.costPrice), 90);
  assert.equal((await prisma.warehouseInventory.findUniqueOrThrow({ where: { warehouseId_productId: { warehouseId: store.id, productId: destination.id } } })).quantity, 7);

  // A completion waiting for the store must not already hold its source product:
  // a concurrent return holds the store and needs that product to credit it.
  const orderedRequest = await request(1, "lock-order");
  let releaseOrganization = () => {};
  let reportOrganizationLock = (_pid: number) => {};
  const organizationReleased = new Promise<void>(resolve => { releaseOrganization = resolve; });
  const organizationLocked = new Promise<number>(resolve => { reportOrganizationLock = resolve; });
  const blocker = prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organization.id} FOR UPDATE`;
    const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
    reportOrganizationLock(pid);
    await organizationReleased;
  }, { timeout: 10_000 });
  const blockerPid = await organizationLocked;
  const completing = call(`/stock-requests/${orderedRequest.id}/complete`);
  try {
    let waitingForOrganization = false;
    const deadline = Date.now() + 3_000;
    while (Date.now() < deadline) {
      const waiters = await prisma.$queryRaw<Array<{ pid: number }>>`
        SELECT pid FROM pg_stat_activity WHERE ${blockerPid} = ANY(pg_blocking_pids(pid))
      `;
      if (waiters.length > 0) { waitingForOrganization = true; break; }
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.ok(waitingForOrganization, "Completion must reach the blocked organization lock");
    await prisma.$transaction(tx => tx.$queryRaw`
      SELECT "id" FROM "Product" WHERE "id" = ${source.id} FOR UPDATE NOWAIT
    `);
  } finally {
    releaseOrganization();
    await blocker;
    const response = await completing;
    assert.equal(response.status, 200, await response.text());
  }
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: source.id } })).stock, 17);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: destination.id } })).stock, 8);

  const register = await prisma.posRegister.create({ data: { organizationId: organization.id, branchId: branch.id, name: "Test", isActive: true } });
  const shift = await prisma.posShift.create({ data: { organizationId: organization.id, branchId: branch.id, registerId: register.id, cashierId: actor.id, openingCash: 0 } });
  const sale = await prisma.posSale.create({ data: {
    receiptNo: `${key}-sale`, organizationId: organization.id, branchId: branch.id, registerId: register.id, shiftId: shift.id,
    cashierId: actor.id, paymentMethod: "CASH", subtotal: 300, taxTotal: 0, discountTotal: 0, grandTotal: 300,
    lines: { create: { productId: voidProduct.id, productName: voidProduct.name, qty: 2, unitPrice: 150, taxAmount: 0, discount: 0, lineTotal: 300 } },
  } });
  const receipt = await prisma.posGoodsReceipt.create({ data: {
    receiptNo: `${key}-receipt`, organizationId: organization.id, branchId: branch.id, registerId: register.id,
    receivedById: actor.id, supplierName: "Test", items: { create: { productId: voidProduct.id, quantity: 10, remainingQuantity: 8, unitCost: 100 } },
  }, include: { items: true } });
  const allocation = await prisma.posGoodsReceiptAllocation.create({ data: {
    receiptItemId: receipt.items[0].id, referenceType: "POS_SALE", referenceId: sale.receiptNo, quantity: 2, unitCost: 100, totalCost: 200,
  } });
  await concurrentPair(`/pos/sales/${sale.id}/void`, { reason: "Concurrent retry regression" }, "POST");
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: voidProduct.id } })).stock, 10);
  assert.equal((await prisma.warehouseInventory.findUniqueOrThrow({ where: { warehouseId_productId: { warehouseId: store.id, productId: voidProduct.id } } })).quantity, 10);
  assert.equal((await prisma.posGoodsReceiptItem.findUniqueOrThrow({ where: { id: receipt.items[0].id } })).remainingQuantity, 10);
  assert.notEqual((await prisma.posGoodsReceiptAllocation.findUniqueOrThrow({ where: { id: allocation.id } })).reversedAt, null);
  assert.equal(await prisma.inventoryLedger.count({ where: { productId: voidProduct.id, referenceType: "POS_VOID", referenceId: sale.receiptNo, change: 2 } }), 1);

  // Older count drafts create receipt lots on approval. Wait on the register
  // before products, so a sale holding that register can finish its stock change.
  const countedInventory = await prisma.warehouseInventory.findUniqueOrThrow({
    where: { warehouseId_productId: { warehouseId: store.id, productId: voidProduct.id } },
  });
  const stocktake = await prisma.stocktake.create({ data: {
    organizationId: organization.id, warehouseId: store.id, title: "Older receipt draft",
    kind: "PARTIAL", status: "REVIEW", createdById: actor.id,
    lines: { create: { productId: voidProduct.id, name: voidProduct.name, unit: "pcs", expected: 10,
      stockUpdatedAt: countedInventory.updatedAt, counted: 11, note: "One additional item counted",
      countedAt: new Date(), countedById: actor.id, receiptRegisterId: register.id, receiptUnitCost: 100 } },
  } });
  let releaseRegister = () => {};
  let reportRegisterLock = (_pid: number) => {};
  const registerReleased = new Promise<void>(resolve => { releaseRegister = resolve; });
  const registerLocked = new Promise<number>(resolve => { reportRegisterLock = resolve; });
  const registerBlocker = prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "PosRegister" WHERE "id" = ${register.id} FOR UPDATE`;
    const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
    reportRegisterLock(pid);
    await registerReleased;
  }, { timeout: 10_000 });
  const registerBlockerPid = await registerLocked;
  const approving = mutateStocktake({ id: stocktake.id, organizationId: organization.id,
    actorId: actor.id, version: stocktake.version, action: "approve" });
  try {
    let waitingForRegister = false;
    const deadline = Date.now() + 3_000;
    while (Date.now() < deadline) {
      const waiters = await prisma.$queryRaw<Array<{ pid: number }>>`
        SELECT pid FROM pg_stat_activity WHERE ${registerBlockerPid} = ANY(pg_blocking_pids(pid))
      `;
      if (waiters.length > 0) { waitingForRegister = true; break; }
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.ok(waitingForRegister, "Stocktake approval must reach the blocked register lock");
    await prisma.$transaction(tx => tx.$queryRaw`
      SELECT "id" FROM "Product" WHERE "id" = ${voidProduct.id} FOR UPDATE NOWAIT
    `);
  } finally {
    releaseRegister();
    await registerBlocker;
    assert.equal((await approving).status, "APPROVED");
  }
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: voidProduct.id } })).stock, 11);
  const countedReceipt = await prisma.posGoodsReceipt.findUniqueOrThrow({
    where: { receiptNo: `STK-${stocktake.id}-${register.id}` }, include: { items: true },
  });
  assert.equal(countedReceipt.items.length, 1);
  assert.equal(countedReceipt.items[0].quantity, 1);
});
