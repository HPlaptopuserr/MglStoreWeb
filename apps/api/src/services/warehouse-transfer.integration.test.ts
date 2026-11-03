import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "@mgl/database";
import {
  receiveWarehouseTransfer,
  sendWarehouseTransfer,
} from "./warehouse-transfer.service";
const enabled =
  process.env.WAREHOUSE_TRANSFER_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(
    new URL(process.env.DATABASE_URL || "http://disabled").hostname,
  );
test(
  "transfer lifecycle is atomic, isolated and safe to retry",
  { skip: !enabled },
  async () => {
    const key = randomUUID();
    const user = await prisma.user.create({
      data: { email: `${key}@transfer.test` },
    });
    const warehouses = await Promise.all(
      ["source", "destination", "other"].map((name) =>
        prisma.warehouse.create({
          data: { name: `${key}-${name}`, address: "Test", type: "CENTRAL" },
        }),
      ),
    );
    const [source, destination, other] = warehouses;
    const products = await Promise.all(
      [0, 1].map((index) =>
        prisma.product.create({
          data: {
            name: `${key}-${index}`,
            barcode: `${key}-${index}`,
            managedByWarehouseId: source.id,
            price: 10,
            costPrice: 3,
            stock: 12,
            warehouseInventories: {
              create: { warehouseId: source.id, quantity: 12 },
            },
          },
        }),
      ),
    );
    const stock = async (warehouseId: string, productId: string) =>
      (
        await prisma.warehouseInventory.findUnique({
          where: { warehouseId_productId: { warehouseId, productId } },
        })
      )?.quantity ?? 0;
    const payload = {
      id: randomUUID(),
      sourceWarehouseId: source.id,
      destinationWarehouseId: destination.id,
      note: "Test",
      items: products.map((product) => ({
        productId: product.id,
        quantity: 2,
      })),
    };
    try {
      await assert.rejects(
        sendWarehouseTransfer(
          {
            ...payload,
            items: [
              { productId: products[0].id, quantity: 1 },
              { productId: products[1].id, quantity: 100 },
            ],
          },
          user.id,
        ),
        /хүрэлцэхгүй/,
      );
      assert.equal(await stock(source.id, products[0].id), 12);
      assert.equal(
        await prisma.warehouseTransfer.count({ where: { id: payload.id } }),
        0,
      );
      const [sent, retried] = await Promise.all([
        sendWarehouseTransfer(payload, user.id),
        sendWarehouseTransfer(payload, user.id),
      ]);
      assert.equal(sent.id, retried.id);
      assert.ok(sent.items.every((row) => Number(row.unitCost) === 10));
      assert.equal(await stock(source.id, products[0].id), 10);
      assert.equal(
        await prisma.warehouseInventory.count({
          where: { warehouseId: destination.id },
        }),
        0,
      );
      const acceptance = sent.items.map((row) => ({
        id: row.id,
        quantity: row.quantity,
        salePrice: 25,
        targetProductId: null as string | null,
      }));
      await assert.rejects(
        receiveWarehouseTransfer(
          sent.id,
          acceptance.map((row) => ({ ...row, quantity: 1 })),
          user.id,
        ),
        /зөрсөн/,
      );
      assert.equal(
        (
          await prisma.warehouseTransfer.findUniqueOrThrow({
            where: { id: sent.id },
          })
        ).status,
        "SENT",
      );
      // Force failure on the second row: the first row's product creation and increment must roll back.
      const foreign = await prisma.product.create({
        data: { name: key, managedByWarehouseId: other.id, price: 1 },
      });
      await assert.rejects(
        receiveWarehouseTransfer(
          sent.id,
          acceptance.map((row, index) =>
            index === 1 ? { ...row, targetProductId: foreign.id } : row,
          ),
          user.id,
        ),
        /эзэмшил/,
      );
      assert.equal(
        await prisma.product.count({
          where: { managedByWarehouseId: destination.id },
        }),
        0,
      );
      const received = await Promise.all([
        receiveWarehouseTransfer(sent.id, acceptance, user.id),
        receiveWarehouseTransfer(sent.id, acceptance, user.id),
      ]);
      assert.ok(received.every((row) => row.status === "RECEIVED"));
      const targets = await prisma.product.findMany({
        where: { managedByWarehouseId: destination.id },
      });
      assert.equal(targets.length, 2);
      for (const target of targets) {
        assert.equal(target.organizationId, null);
        assert.equal(target.stock, 2);
        assert.equal(Number(target.price), 25);
      }
      assert.equal(
        await prisma.inventoryLedger.count({
          where: { referenceId: sent.id, reason: "TRANSFER_IN" },
        }),
        2,
      );
      // Existing destination inventory is incremented, never overwritten.
      const second = await sendWarehouseTransfer(
        { ...payload, id: randomUUID() },
        user.id,
      );
      await receiveWarehouseTransfer(
        second.id,
        second.items.map((row) => ({
          id: row.id,
          quantity: row.quantity,
          salePrice: 30,
          targetProductId: targets.find(
            (target) => target.barcode === row.barcode,
          )!.id,
        })),
        user.id,
      );
      for (const target of targets)
        assert.equal(await stock(destination.id, target.id), 4);
      assert.equal(await stock(source.id, products[0].id), 8);
      // Two competing shipments cannot oversell remaining stock.
      const competing = await Promise.allSettled(
        [1, 2].map(() =>
          sendWarehouseTransfer(
            {
              ...payload,
              id: randomUUID(),
              items: [{ productId: products[0].id, quantity: 7 }],
            },
            user.id,
          ),
        ),
      );
      assert.equal(
        competing.filter((result) => result.status === "fulfilled").length,
        1,
      );
      assert.equal(await stock(source.id, products[0].id), 1);
    } finally {
      const ids = warehouses.map((row) => row.id);
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
      await prisma.warehouse.deleteMany({ where: { id: { in: ids } } });
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.$disconnect();
    }
  },
);
