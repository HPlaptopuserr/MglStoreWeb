import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import * as XLSX from "xlsx";
import { prisma } from "@mgl/database";
import warehousesRouter from "./warehouses.routes";
import receiptsRouter from "./warehouse-goods-receipts.routes";

const url = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled = process.env.STORE_ISOLATION_INTEGRATION === "1" &&
  url.hostname === "localhost" && url.pathname.startsWith("/wms_test_");

test("warehouse recipients keep independent prices and inventory through receipt, edit and delete", { skip: !enabled }, async (t) => {
  const key = randomUUID();
  const organizations = await Promise.all(["a", "b"].map(suffix => prisma.organization.create({
    data: { name: `Store ${suffix}`, slug: `${key}-${suffix}`, taxId: `${key}-${suffix}` },
  })));
  const operator = await prisma.user.create({ data: { email: `${key}@test.invalid` } });
  const warehouse = await prisma.warehouse.create({ data: {
    name: "Distribution warehouse", address: "Test", type: "CENTRAL",
    organizations: { create: organizations.map(organization => ({ organizationId: organization.id })) },
    setupTokens: { create: { userId: operator.id, token: key, usedAt: new Date(), expiresAt: new Date() } },
  } });
  const products = await Promise.all(organizations.map(organization => prisma.product.create({ data: {
    name: "Same juice", organizationId: organization.id, barcode: key, price: 4800, costPrice: 3640, stock: 6,
  } })));
  // Existing corrupt links must not authorize further edits or deletion.
  await prisma.warehouseInventory.create({ data: { warehouseId: warehouse.id, productId: products[0].id, quantity: 120 } });
  const app = express();
  app.use(express.json(), warehousesRouter, receiptsRouter);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.close(); });
  const token = jwt.sign({ userId: operator.id, role: "ADMIN" }, process.env.JWT_SECRET || "dev-secret-change-me");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = (path: string, method = "GET", body?: object) => fetch(`${base}${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const importStock = async (row: { name: string; sku: string; price: number; stock: number }) => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([row]), "Stock");
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(XLSX.write(workbook, { type: "array", bookType: "xlsx" }))], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "stock.xlsx");
    const response = await fetch(`${base}/warehouses/${warehouse.id}/products/import`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
    });
    assert.equal(response.status, 200, await response.clone().text());
    return response.json() as Promise<{ created: number; updated: number; skipped: number; errors: string[] }>;
  };
  for (const product of products) {
    const receipt = await call("/warehouse-goods-receipts", "POST", {
      warehouseId: warehouse.id, supplierName: "Supplier", confirm: true,
      items: [{ productId: product.id, quantity: 120, unitCost: 3640 }],
    });
    assert.equal(receipt.status, 409, await receipt.text());
    const stock = await call(`/warehouses/${warehouse.id}/inventory`, "POST", { productId: product.id, quantity: 999 });
    assert.equal(stock.status, 409, await stock.text());
  }
  const path = `/warehouses/${warehouse.id}/inventory/${products[0].id}`;
  const edit = await call(path, "PATCH", { price: 1, quantity: 999 });
  assert.equal(edit.status, 409, await edit.text());
  const removal = await call(path, "DELETE");
  assert.equal(removal.status, 409, await removal.text());
  assert.equal(await prisma.warehouseGoodsReceipt.count({ where: { warehouseId: warehouse.id } }), 0);
  const blockedImport = await importStock({ name: "Same juice", sku: key, price: 1, stock: 999 });
  assert.equal(blockedImport.skipped, 1);
  assert.equal(blockedImport.created, 0);
  assert.equal(await prisma.product.count({ where: { managedByWarehouseId: warehouse.id } }), 0);
  const ownSku = `${key}-warehouse`;
  const create = await call(`/warehouses/${warehouse.id}/products`, "POST", { name: "Own juice", sku: ownSku, barcode: key, price: 3640, quantity: 10 });
  assert.equal(create.status, 201, await create.clone().text());
  const own = await create.json() as { id: string; organizationId: string | null };
  assert.equal(own.organizationId, null);
  const ownPath = `/warehouses/${warehouse.id}/inventory/${own.id}`;
  assert.equal((await call(ownPath, "PATCH", { price: 3700, quantity: 12 })).status, 200);
  const cleared = await importStock({ name: "Own juice", sku: ownSku, price: 3700, stock: 0 });
  assert.equal(cleared.updated, 1);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: own.id } })).stock, 0);
  assert.equal((await prisma.warehouseInventory.findUniqueOrThrow({ where: { warehouseId_productId: { warehouseId: warehouse.id, productId: own.id } } })).quantity, 0);
  assert.equal((await prisma.inventoryLedger.aggregate({ where: { productId: own.id }, _sum: { change: true } }))._sum.change, 0);
  const imported = await importStock({ name: "Own juice", sku: ownSku, price: 3700, stock: 5 });
  assert.equal(imported.updated, 1);
  const beforeRepeat = await prisma.inventoryLedger.count({ where: { productId: own.id } });
  assert.equal((await importStock({ name: "Own juice", sku: ownSku, price: 3700, stock: 5 })).updated, 1);
  assert.equal(await prisma.inventoryLedger.count({ where: { productId: own.id } }), beforeRepeat);
  assert.equal((await prisma.inventoryLedger.aggregate({ where: { productId: own.id }, _sum: { change: true } }))._sum.change, 5);
  assert.equal((await call(ownPath, "DELETE")).status, 200);
  for (const original of products) {
    const current = await prisma.product.findUniqueOrThrow({ where: { id: original.id } });
    assert.equal(current.stock, 6);
    assert.equal(Number(current.price), 4800);
    assert.equal(current.deletedAt, null);
  }
});
