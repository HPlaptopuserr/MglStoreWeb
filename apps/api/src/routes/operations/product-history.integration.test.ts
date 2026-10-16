import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import router from "./product-history.routes";
const enabled =
  process.env.PRODUCT_HISTORY_INTEGRATION === "1" &&
  new URL(process.env.DATABASE_URL || "http://disabled").pathname.includes(
    "history_test",
  );
test(
  "read-only history enforces ownership, deduplicates receipts, and paginates without overlap",
  { skip: !enabled },
  async () => {
    const key = randomUUID();
    const user = await prisma.user.create({
      data: {
        email: `${key}@history.test`,
        profile: { create: { fullName: "History Operator" } },
      },
    });
    const outsider = await prisma.user.create({
      data: { email: `${key}-other@history.test` },
    });
    const warehouse = await prisma.warehouse.create({
      data: { name: key, address: "Test" },
    });
    await prisma.warehouseSetupToken.create({
      data: {
        warehouseId: warehouse.id,
        userId: user.id,
        token: key,
        usedAt: new Date(),
        expiresAt: new Date(),
      },
    });
    const product = await prisma.product.create({
      data: {
        name: key,
        price: 100,
        stock: 99,
        submittedById: user.id,
        managedByWarehouseId: warehouse.id,
      },
    });
    await prisma.inventoryLedger.createMany({
      data: Array.from({ length: 32 }, (_, i) => ({
        productId: product.id,
        warehouseId: warehouse.id,
        change: 2,
        reason: "RESTOCK" as const,
        createdById: user.id,
        referenceType: "WAREHOUSE_GOODS_RECEIPT",
        referenceId: i < 2 ? "same-document" : `document-${i}`,
        createdAt: new Date(Date.UTC(2026, 0, i + 1)),
      })),
    });
    const org = await prisma.organization.create({
      data: {
        name: key,
        slug: key,
        taxId: key,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });
    const vendorProduct = await prisma.product.create({
      data: { name: key, organizationId: org.id, price: 1, unit: "kg" },
    });
    const branch = await prisma.branch.create({
      data: { name: key, address: "Test", organizationId: org.id },
    });
    await prisma.cafeDailyStockReceipt.create({
      data: {
        productId: vendorProduct.id,
        organizationId: org.id,
        branchId: branch.id,
        batchId: key,
        businessDate: new Date(),
        quantity: 2.5,
        receivedById: user.id,
      },
    });
    const app = express();
    app.use(router);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("port missing");
    const request = (userId: string, suffix = "", productId = product.id) =>
      fetch(
        `http://127.0.0.1:${address.port}/product-history/${productId}${suffix}`,
        {
          headers: {
            Authorization: `Bearer ${jwt.sign({ userId, role: "USER", email: "test" }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
          },
        },
      );
    try {
      assert.equal((await request(outsider.id)).status, 403);
      assert.equal(
        (await request(outsider.id, "", vendorProduct.id)).status,
        403,
      );
      const cafe = await (
        await request(user.id, "?stream=cafe", vendorProduct.id)
      ).json();
      assert.equal(cafe.entries[0].quantity, 2.5);
      assert.equal(cafe.entries[0].userName, "History Operator");
      assert.equal(cafe.summary.arrivalCount, 1);
      assert.equal(cafe.summary.averageDays, null);
      assert.equal(
        (await request(user.id, "?stream=cafe&cursor=bad", vendorProduct.id))
          .status,
        400,
      );
      const response = await request(user.id);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      const first = await response.json();
      assert.equal(first.registration.userName, "History Operator");
      assert.equal(first.registration.menu, null);
      assert.equal(first.summary.arrivalCount, 31);
      assert.equal(first.summary.totalReceived, 64);
      assert.equal(first.entries.length, 30);
      const next = await (
        await request(user.id, `?cursor=${first.nextCursor}`)
      ).json();
      assert.equal(next.entries.length, 2);
      assert.equal(next.nextCursor, null);
      assert.equal(
        new Set(
          [...first.entries, ...next.entries].map((e: { id: string }) => e.id),
        ).size,
        32,
      );
      assert.equal((await request(user.id, "?cursor=bad")).status, 400);
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
          .stock,
        99,
      );
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.cafeDailyStockReceipt.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.product.delete({ where: { id: vendorProduct.id } });
      await prisma.branch.delete({ where: { id: branch.id } });
      await prisma.organization.delete({ where: { id: org.id } });
      await prisma.inventoryLedger.deleteMany({
        where: { productId: product.id },
      });
      await prisma.product.delete({ where: { id: product.id } });
      await prisma.warehouseSetupToken.deleteMany({
        where: { warehouseId: warehouse.id },
      });
      await prisma.warehouse.delete({ where: { id: warehouse.id } });
      await prisma.user.deleteMany({
        where: { id: { in: [user.id, outsider.id] } },
      });
      await prisma.$disconnect();
    }
  },
);
