import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import router from "./warehouse-transfers.routes";
const enabled =
  process.env.WAREHOUSE_TRANSFER_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(
    new URL(process.env.DATABASE_URL || "http://disabled").hostname,
  );
test(
  "source operator sees all central destinations but only destination operator can receive",
  { skip: !enabled },
  async () => {
    const key = randomUUID();
    const users = await Promise.all(
      [0, 1].map((index) =>
        prisma.user.create({
          data: { email: `${key}-${index}@transfer.test` },
        }),
      ),
    );
    const source = await prisma.warehouse.create({
      data: { name: key, address: "Test" },
    });
    const destination = await prisma.warehouse.create({
      data: { name: `${key}-dest`, address: "Test" },
    });
    const vendor = await prisma.warehouse.create({
      data: { name: `${key}-vendor`, address: "Test", type: "VENDOR_INTERNAL" },
    });
    const inactive = await prisma.warehouse.create({
      data: { name: `${key}-inactive`, address: "Test", isActive: false },
    });
    const ids = [source.id, destination.id, vendor.id, inactive.id];
    await Promise.all(
      [source, destination].map((warehouse, index) =>
        prisma.warehouseSetupToken.create({
          data: {
            userId: users[index].id,
            warehouseId: warehouse.id,
            token: randomUUID(),
            usedAt: new Date(),
            expiresAt: new Date(),
          },
        }),
      ),
    );
    const product = await prisma.product.create({
      data: {
        name: key,
        price: 1,
        stock: 3,
        managedByWarehouseId: source.id,
        warehouseInventories: {
          create: { warehouseId: source.id, quantity: 3 },
        },
      },
    });
    const app = express();
    app.use(express.json(), router);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("No test port");
    const request = (path: string, index: number, body?: unknown) =>
      fetch(`http://127.0.0.1:${address.port}${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt.sign({ userId: users[index].id, email: users[index].email, role: "USER" }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    try {
      const inventoryPath = `/warehouse-transfers/inventory?sourceWarehouseId=${source.id}`;
      assert.equal((await request(inventoryPath, 1)).status, 403);
      const inventoryResponse = await request(inventoryPath, 0);
      assert.equal(inventoryResponse.status, 200);
      const inventory = await inventoryResponse.json() as { quantity: number; product: { id: string; price: string } }[];
      assert.equal(inventory.length, 1);
      assert.equal(inventory[0].product.id, product.id);
      assert.equal(inventory[0].quantity, 3);
      assert.equal(Number(inventory[0].product.price), 1);
      const options = (await (
        await request(
          `/warehouse-transfers/destinations?sourceWarehouseId=${source.id}`,
          0,
        )
      ).json()) as { id: string }[];
      assert.ok(options.some((row) => row.id === destination.id));
      for (const id of [source.id, vendor.id, inactive.id])
        assert.ok(!options.some((row) => row.id === id));
      const sent = await request("/warehouse-transfers", 0, {
        id: randomUUID(),
        sourceWarehouseId: source.id,
        destinationWarehouseId: destination.id,
        items: [{ productId: product.id, quantity: 1 }],
      });
      assert.equal(sent.status, 201);
      const document = (await sent.json()) as {
        id: string;
        items: { id: string }[];
      };
      const body = {
        items: document.items.map((item) => ({
          id: item.id,
          quantity: 1,
          salePrice: 5,
          targetProductId: null,
        })),
      };
      assert.equal(
        (await request(`/warehouse-transfers/${document.id}/receive`, 0, body))
          .status,
        403,
      );
      assert.equal(
        (await request(`/warehouse-transfers?warehouseId=${destination.id}`, 0))
          .status,
        403,
      );
      assert.equal(
        (await request(`/warehouse-transfers/${document.id}/receive`, 1, body))
          .status,
        200,
      );
      assert.equal(
        (await request(`/warehouse-transfers/${document.id}/receive`, 1, body))
          .status,
        200,
      );
      assert.equal(
        await prisma.inventoryLedger.count({
          where: { referenceId: document.id, reason: "TRANSFER_IN" },
        }),
        1,
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await prisma.inventoryLedger.deleteMany({
        where: { warehouseId: { in: ids } },
      });
      await prisma.warehouseTransfer.deleteMany({
        where: { sourceWarehouseId: source.id },
      });
      await prisma.warehouseInventory.deleteMany({
        where: { warehouseId: { in: ids } },
      });
      await prisma.product.deleteMany({
        where: { managedByWarehouseId: { in: ids } },
      });
      await prisma.warehouseSetupToken.deleteMany({
        where: { warehouseId: { in: ids } },
      });
      await prisma.warehouse.deleteMany({ where: { id: { in: ids } } });
      await prisma.user.deleteMany({
        where: { id: { in: users.map((row) => row.id) } },
      });
      await prisma.$disconnect();
    }
  },
);
