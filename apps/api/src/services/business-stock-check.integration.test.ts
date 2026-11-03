import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import { saveBusinessStockCheck } from "./business-stock-check.service";
const database = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL)
  : null;
const enabled =
  process.env.BUSINESS_STOCK_CHECK_INTEGRATION === "1" &&
  !!database &&
  ["localhost", "127.0.0.1"].includes(database.hostname);

test(
  "mobile corrections are scoped, atomic and visible with the real actor in web history",
  { skip: !enabled },
  async () => {
    const key = `stock-check-${randomUUID()}`;
    const owner = await prisma.user.create({
      data: {
        email: `${key}@test.local`,
        profile: { create: { fullName: "Stock Check Owner" } },
      },
    });
    const worker = await prisma.user.create({
      data: {
        email: `${key}-worker@test.local`,
        profile: { create: { fullName: "Stock Manager" } },
      },
    });
    const cashier = await prisma.user.create({
      data: { email: `${key}-cashier@test.local` },
    });
    const org = await prisma.organization.create({
      data: {
        name: key,
        slug: key,
        taxId: key,
        status: "ACTIVE",
        members: {
          create: [
            { userId: owner.id, role: "OWNER" },
            {
              userId: worker.id,
              role: "STAFF",
              capabilities: ["STOCK_MANAGER"],
            },
            {
              userId: cashier.id,
              role: "STAFF",
              capabilities: ["POS_CASHIER"],
            },
          ],
        },
      },
    });
    const other = await prisma.organization.create({
      data: {
        name: `${key}-other`,
        slug: `${key}-other`,
        taxId: `${key}-other`,
        status: "ACTIVE",
      },
    });
    const product = await prisma.product.create({
      data: {
        name: key,
        organizationId: org.id,
        unit: "kg",
        stock: 1000,
        price: 100,
      },
    });
    const untouched = await prisma.product.create({
      data: {
        name: `${key}-other`,
        organizationId: other.id,
        stock: 42,
        price: 900,
      },
    });
    const token = (userId: string) =>
      jwt.sign(
        {
          userId,
          email: "test",
          role: "USER",
          orgRole: userId === owner.id ? "OWNER" : "STAFF",
          organizationId: org.id,
        },
        process.env.JWT_SECRET || "dev-secret-change-me",
        { expiresIn: "5m" },
      );
    const request = (userId: string, body: object, id = product.id) =>
      fetch(`http://127.0.0.1:4000/api/products/${id}/stock-check`, {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token(userId)}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
    const baseline = {
      organizationId: org.id,
      expectedStock: 1,
      expectedPrice: 100,
      expectedUnit: "kg",
      note: "Бодит тооллогын зөрүү",
    };
    try {
      const saved = await request(owner.id, {
        ...baseline,
        stock: 1.5,
        price: 120,
        actorId: cashier.id,
      });
      assert.equal(saved.status, 200, await saved.text());
      const historyResponse = await fetch(
        `http://127.0.0.1:4000/api/product-history/${product.id}`,
        { headers: { authorization: `Bearer ${token(owner.id)}` } },
      );
      assert.equal(historyResponse.status, 200);
      const history = await historyResponse.json();
      assert.equal(history.entries[0].userId, owner.id);
      assert.equal(history.entries[0].userName, "Stock Check Owner");
      assert.equal(history.entries[0].reason, "MANUAL_ADJUST");
      assert.equal(history.entries[0].referenceType, "BUSINESS_STOCK_CHECK");
      assert.deepEqual(history.entries[0].adjustment, {
        beforeStock: 1,
        afterStock: 1.5,
        beforePrice: 100,
        afterPrice: 120,
        unit: "kg",
      });
      assert.equal(history.summary.totalReceived, 0);
      assert.equal(
        (
          await request(owner.id, {
            ...baseline,
            expectedStock: 1.5,
            expectedPrice: 120,
            price: 140,
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await request(worker.id, {
            ...baseline,
            expectedStock: 1.5,
            expectedPrice: 140,
            stock: 2.25,
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await request(worker.id, {
            ...baseline,
            expectedStock: 2.25,
            expectedPrice: 140,
            price: 150,
          })
        ).status,
        403,
      );
      assert.equal(
        (await request(cashier.id, { ...baseline, stock: 20 })).status,
        403,
      );
      assert.equal(
        (await request(owner.id, { ...baseline, stock: 2 })).status,
        409,
      );
      assert.equal(
        (await request(owner.id, { ...baseline, stock: 2 }, untouched.id))
          .status,
        404,
      );
      assert.equal(
        (
          await request(
            owner.id,
            { ...baseline, organizationId: other.id, stock: 2 },
            untouched.id,
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await request(worker.id, {
            ...baseline,
            expectedStock: 2.25,
            expectedPrice: 140,
            stock: 3,
            price: 150,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await request(owner.id, {
            ...baseline,
            expectedStock: 2.25,
            expectedPrice: 140,
            stock: 2.2501,
          })
        ).status,
        400,
      );
      const beforeRollback = await prisma.inventoryLedger.count({
        where: { productId: product.id },
      });
      assert.equal(beforeRollback, 3);
      const abort = new Error("rollback test transaction");
      await assert.rejects(
        prisma.$transaction(async (tx) => {
          await saveBusinessStockCheck(
            tx,
            product.id,
            owner.id,
            new Set([Permission.MANAGE_STOCK, Permission.MANAGE_PRODUCTS]),
            {
              ...baseline,
              expectedStock: 2.25,
              expectedPrice: 140,
              stock: 2.5,
              price: 145,
            },
          );
          throw abort;
        }),
        (error) => error === abort,
      );
      assert.equal(
        await prisma.inventoryLedger.count({
          where: { productId: product.id },
        }),
        3,
      );
      const current = await prisma.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      assert.equal(current.stock, 2250);
      assert.equal(Number(current.price), 140);
      const inventory = await prisma.warehouseInventory.findFirstOrThrow({
        where: { productId: product.id },
      });
      assert.equal(inventory.quantity, 2250);
      const external = await prisma.product.findUniqueOrThrow({
        where: { id: untouched.id },
      });
      assert.equal(external.stock, 42);
      assert.equal(Number(external.price), 900);
      const logs = await prisma.inventoryLedger.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: "asc" },
      });
      assert.equal(logs[1].change, 0);
      assert.equal(logs[2].createdById, worker.id);
    } finally {
      const links = await prisma.warehouseOrganization.findMany({
        where: { organizationId: org.id },
        select: { warehouseId: true },
      });
      const warehouses = links.map((link) => link.warehouseId);
      await prisma.inventoryLedger.deleteMany({
        where: { productId: { in: [product.id, untouched.id] } },
      });
      await prisma.warehouseInventory.deleteMany({
        where: { productId: product.id },
      });
      await prisma.product.deleteMany({
        where: { id: { in: [product.id, untouched.id] } },
      });
      await prisma.warehouseOrganization.deleteMany({
        where: { warehouseId: { in: warehouses } },
      });
      await prisma.warehouse.deleteMany({ where: { id: { in: warehouses } } });
      await prisma.organization.deleteMany({
        where: { id: { in: [org.id, other.id] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [owner.id, worker.id, cashier.id] } },
      });
      await prisma.$disconnect();
    }
  },
);
