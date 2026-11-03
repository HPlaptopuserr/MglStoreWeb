import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import stockRequests from "./stock-requests.routes";
import warehouses from "./warehouses.routes";

const enabled =
  process.env.VENDOR_PROCUREMENT_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(
    new URL(process.env.DATABASE_URL || "http://disabled").hostname,
  );

test(
  "unassigned vendors can browse and order central stock; debt never hides the catalog",
  { skip: !enabled },
  async () => {
    const key = randomUUID();
    const user = await prisma.user.create({
      data: { email: `${key}@procurement.test` },
    });
    const vendor = await prisma.organization.create({
      data: {
        name: key,
        slug: key,
        taxId: key,
        type: "VENDOR",
        members: { create: { userId: user.id, role: "OWNER", isActive: true } },
      },
    });
    const other = await prisma.organization.create({
      data: {
        name: `${key}-other`,
        slug: `${key}-other`,
        taxId: `${key}-other`,
        type: "VENDOR",
      },
    });
    const central = await prisma.warehouse.create({
      data: { name: key, address: "Test", type: "CENTRAL" },
    });
    const internal = await prisma.warehouse.create({
      data: {
        name: `${key}-private`,
        address: "Test",
        type: "VENDOR_INTERNAL",
      },
    });
    const inactive = await prisma.warehouse.create({
      data: {
        name: `${key}-inactive`,
        address: "Test",
        type: "CENTRAL",
        isActive: false,
      },
    });
    const deleted = await prisma.warehouse.create({
      data: {
        name: `${key}-deleted`,
        address: "Test",
        type: "CENTRAL",
        deletedAt: new Date(),
      },
    });
    const warehouseIds = [central.id, internal.id, inactive.id, deleted.id];
    const product = await prisma.product.create({
      data: {
        name: key,
        price: 100,
        stock: 20,
        managedByWarehouseId: central.id,
        warehouseInventories: {
          create: { warehouseId: central.id, quantity: 20 },
        },
      },
    });
    const app = express();
    app.use(express.json(), stockRequests, warehouses);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("No test port");
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: "USER" },
      process.env.JWT_SECRET || "dev-secret-change-me",
    );
    const request = (path: string, body?: unknown, authenticated = true) =>
      fetch(`http://127.0.0.1:${address.port}${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          ...(authenticated ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    const productsPath = (warehouseId: string, organizationId = vendor.id) =>
      `/stock-requests/warehouse/${warehouseId}/products?organizationId=${organizationId}&mode=catalog`;
    try {
      assert.equal(
        await prisma.warehouseOrganization.count({
          where: { organizationId: vendor.id },
        }),
        0,
      );
      assert.equal(
        (
          await request(
            `/warehouses/organization/${vendor.id}/order-sources`,
            undefined,
            false,
          )
        ).status,
        401,
      );
      const sources = await request(
        `/warehouses/organization/${vendor.id}/order-sources`,
      );
      assert.equal(sources.status, 200);
      const sourceIds = ((await sources.json()) as { id: string }[]).map(
        (source) => source.id,
      );
      assert.ok(sourceIds.includes(central.id));
      for (const hidden of [internal, inactive, deleted])
        assert.ok(!sourceIds.includes(hidden.id));
      assert.equal((await request(productsPath(central.id))).status, 200);
      assert.equal(
        (await request(productsPath(central.id, other.id))).status,
        403,
      );
      assert.equal(
        (await request(`/warehouses/organization/${other.id}/order-sources`))
          .status,
        403,
      );
      for (const hidden of [internal, inactive, deleted])
        assert.equal((await request(productsPath(hidden.id))).status, 403);
      const body = {
        organizationId: vendor.id,
        warehouseId: central.id,
        deliveryAddress: "Local test",
        items: [{ productId: product.id, quantity: 1 }],
      };
      const ordered = await request("/stock-requests", body);
      assert.equal(ordered.status, 201, await ordered.text());
      const afterOrder = await request(productsPath(central.id));
      assert.equal(afterOrder.status, 200);
      const catalog = (await afterOrder.json()) as {
        items: { product: { id: string } }[];
      };
      assert.ok(catalog.items.some((item) => item.product.id === product.id));
      const blocked = await request("/stock-requests", body);
      assert.equal(blocked.status, 409);
      assert.equal(
        ((await blocked.json()) as { code: string }).code,
        "OUTSTANDING_STOCK_PAYMENT",
      );
      assert.equal(
        (
          await request(
            `/stock-requests/warehouse/${central.id}/recommendations?organizationId=${vendor.id}`,
          )
        ).status,
        200,
      );
      // Non-vendor organizations retain their explicit assignment policy.
      await prisma.organization.update({
        where: { id: other.id },
        data: { type: "SUPPLIER" },
      });
      await prisma.organizationMember.create({
        data: { organizationId: other.id, userId: user.id, role: "OWNER" },
      });
      assert.equal(
        (await request(productsPath(central.id, other.id))).status,
        403,
      );
      await prisma.warehouseOrganization.create({
        data: { warehouseId: central.id, organizationId: other.id },
      });
      assert.equal(
        (await request(productsPath(central.id, other.id))).status,
        200,
      );
      await prisma.organization.update({
        where: { id: vendor.id },
        data: { status: "SUSPENDED" },
      });
      assert.equal((await request(productsPath(central.id))).status, 403);
      // Procurement never grants warehouse operation access.
      assert.equal(
        (await request(`/stock-requests/warehouse/${central.id}/dispatches`))
          .status,
        403,
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      const requests = await prisma.warehouseStockRequest.findMany({
        where: { organizationId: vendor.id },
        select: { id: true },
      });
      const requestIds = requests.map((r) => r.id);
      await prisma.stockRequestPayment.deleteMany({
        where: { requestId: { in: requestIds } },
      });
      await prisma.warehouseStockRequestItem.deleteMany({
        where: { requestId: { in: requestIds } },
      });
      await prisma.warehouseStockRequest.deleteMany({
        where: { id: { in: requestIds } },
      });
      await prisma.warehouseInventory.deleteMany({
        where: { productId: product.id },
      });
      await prisma.product.delete({ where: { id: product.id } });
      await prisma.warehouseOrganization.deleteMany({
        where: { organizationId: { in: [vendor.id, other.id] } },
      });
      await prisma.warehouse.deleteMany({
        where: { id: { in: warehouseIds } },
      });
      await prisma.organizationMember.deleteMany({
        where: { userId: user.id },
      });
      await prisma.organization.deleteMany({
        where: { id: { in: [vendor.id, other.id] } },
      });
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.$disconnect();
    }
  },
);
