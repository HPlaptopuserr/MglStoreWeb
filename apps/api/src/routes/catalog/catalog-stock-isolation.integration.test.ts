import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import productsRouter from "./products.routes";

const url = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled = process.env.STORE_ISOLATION_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.startsWith("/wms_test_");

test("vendor metadata, barcode, images and deletion cannot mutate unresolved central inventory", { skip: !enabled }, async () => {
  const key = randomUUID();
  const organization = await prisma.organization.create({ data: { name: key, slug: key, taxId: key } });
  const owner = await prisma.user.create({ data: { email: `${key}@test.invalid` } });
  await prisma.organizationMember.create({ data: { userId: owner.id, organizationId: organization.id, role: "OWNER" } });
  const central = await prisma.warehouse.create({ data: { name: key, address: "Test", type: "CENTRAL", organizations: { create: { organizationId: organization.id } } } });
  const original = await prisma.product.create({ data: {
    name: "Pearl legacy", organizationId: organization.id, sku: key, barcode: key,
    price: 1690, costPrice: 1300, stock: 300,
    images: { create: { url: "/api/original-pearl.png" } },
    warehouseInventories: { create: { warehouseId: central.id, quantity: 300 } },
  } });
  const independent = await prisma.product.create({ data: {
    name: "Private water", organizationId: organization.id, price: 1300, stock: 20,
  } });
  const app = express();
  app.use(express.json(), productsRouter);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const token = jwt.sign({ userId: owner.id, role: "USER" }, process.env.JWT_SECRET || "dev-secret-change-me");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = (path: string, method: string, body?: object) => fetch(`${base}${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    const attempts: { path: string; method: string; body?: object }[] = [
      { path: `/products/${original.id}`, method: "PATCH", body: { name: "Changed", price: 1, barcode: `${key}-wrong` } },
      { path: `/products/${original.id}`, method: "PATCH", body: { images: ["/api/wrong-pearl.png"] } },
      { path: `/products/${original.id}/images`, method: "PATCH", body: { images: ["/api/wrong-pearl.png"] } },
      { path: `/products/${original.id}`, method: "DELETE" },
    ];
    for (const attempt of attempts) {
      const response = await call(attempt.path, attempt.method, attempt.body);
      assert.equal(response.status, 409, await response.text());
      const current = await prisma.product.findUniqueOrThrow({ where: { id: original.id }, include: { images: true, warehouseInventories: true } });
      assert.equal(current.name, original.name);
      assert.equal(Number(current.price), 1690);
      assert.equal(current.barcode, key);
      assert.equal(current.sku, key);
      assert.equal(current.deletedAt, null);
      assert.equal(current.isActive, true);
      assert.equal(current.stock, 300);
      assert.equal(current.warehouseInventories[0].quantity, 300);
      assert.deepEqual(current.images.map(image => image.url), ["/api/original-pearl.png"]);
    }
    // Reproduce a repair changing ownership between the permission read and
    // mutation. The now-valid central link must not authorize the stale vendor.
    let changeOwnershipAfterRead = true;
    prisma.$use(async (params, next) => {
      const result: unknown = await next(params);
      const args = params.args as { where?: { id?: unknown; deletedAt?: unknown } } | undefined;
      if (changeOwnershipAfterRead && params.model === "Product" && params.action === "findUnique" &&
        args?.where?.id === original.id && args.where.deletedAt === null) {
        changeOwnershipAfterRead = false;
        await prisma.product.update({ where: { id: original.id }, data: { managedByWarehouseId: central.id } });
      }
      return result;
    });
    const staleRemoval = await call(`/products/${original.id}`, "DELETE");
    assert.equal(staleRemoval.status, 409, await staleRemoval.text());
    const repaired = await prisma.product.findUniqueOrThrow({ where: { id: original.id } });
    assert.equal(repaired.managedByWarehouseId, central.id);
    assert.equal(repaired.deletedAt, null);
    assert.equal(repaired.stock, 300);
    // Ordinary vendor catalog edits and deletion still work for independent stock.
    assert.equal((await call(`/products/${independent.id}`, "PATCH", { name: "Private water updated", price: 1400 })).status, 200);
    assert.equal((await call(`/products/${independent.id}/images`, "PATCH", { images: ["/api/private-water.png"] })).status, 200);
    assert.equal((await call(`/products/${independent.id}`, "DELETE")).status, 200);
    assert.notEqual((await prisma.product.findUniqueOrThrow({ where: { id: independent.id } })).deletedAt, null);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.warehouseInventory.deleteMany({ where: { productId: { in: [original.id, independent.id] } } });
    await prisma.product.deleteMany({ where: { id: { in: [original.id, independent.id] } } });
    await prisma.warehouseOrganization.deleteMany({ where: { warehouseId: central.id } });
    await prisma.warehouse.delete({ where: { id: central.id } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: organization.id } });
    await prisma.organization.delete({ where: { id: organization.id } });
    await prisma.user.delete({ where: { id: owner.id } });
  }
});
