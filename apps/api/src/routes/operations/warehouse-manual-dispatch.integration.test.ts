import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import type {
  WarehouseDispatchDocument,
  WarehouseDispatchHistory,
} from "@mgl/types";
import routes from "./warehouse-manual-dispatch.routes";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled =
  process.env.WAREHOUSE_VIEWER_INTEGRATION === "1" &&
  ["127.0.0.1", "localhost"].includes(database.hostname) &&
  database.pathname.startsWith("/wms_test_");
test(
  "manual dispatches create optional-location documents, preserve snapshots and isolate history",
  { skip: !enabled },
  async (t) => {
    const marker = randomUUID(),
      users: string[] = [],
      warehouses: string[] = [],
      products: string[] = [];
    const app = express();
    app.use(express.json());
    app.use(routes);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const call = (path: string, userId?: string, body?: unknown) =>
      fetch(`http://127.0.0.1:${address.port}${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          ...(userId
            ? {
                Authorization: `Bearer ${jwt.sign({ userId, role: "USER", email: "test@dispatch.test" }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
              }
            : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    try {
      for (const name of ["operator", "viewer", "outsider"])
        users.push(
          (
            await prisma.user.create({
              data: { email: `${name}-${marker}@dispatch.test` },
            })
          ).id,
        );
      for (const name of ["own", "other"])
        warehouses.push(
          (
            await prisma.warehouse.create({
              data: {
                name: `${name}-${marker}`,
                address: "Test",
                type: "CENTRAL",
              },
            })
          ).id,
        );
      const [operator, viewer, outsider] = users,
        [own, other] = warehouses;
      await prisma.warehouseSetupToken.create({
        data: {
          warehouseId: own,
          userId: operator,
          token: marker,
          usedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      await prisma.warehouseViewer.create({
        data: { warehouseId: own, userId: viewer, grantedById: operator },
      });
      for (const warehouseId of [own, own, other])
        products.push(
          (
            await prisma.product.create({
              data: {
                name: `Product-${products.length}-${marker}`,
                sku: `SKU-${products.length}-${marker}`,
                managedByWarehouseId: warehouseId,
                price: 100.25,
                stock: 100,
                warehouseInventories: {
                  create: { warehouseId, quantity: 100 },
                },
              },
            })
          ).id,
        );
      const base = `/warehouses/${own}/manual-dispatches`;
      const draft = {
        requestId: randomUUID(),
        storeName: "Бүртгэлгүй дэлгүүр",
        recipientName: "Хүлээн авагч",
        recipientPhone: "99112233",
        items: [{ productId: products[0], quantity: 4, unitPrice: 1 }],
      };
      let document: WarehouseDispatchDocument;
      const stock = async (id: string) =>
        (
          await prisma.warehouseInventory.findUniqueOrThrow({
            where: {
              warehouseId_productId: { warehouseId: own, productId: id },
            },
          })
        ).quantity;
      await t.test(
        "only warehouse operators can create or inspect documents",
        async () => {
          assert.equal((await call(base, undefined)).status, 401);
          for (const userId of [viewer, outsider]) {
            assert.equal((await call(base, userId, draft)).status, 403);
            assert.equal((await call(base, userId)).status, 403);
          }
          assert.equal(
            (await call(`/warehouses/${other}/manual-dispatches`, operator))
              .status,
            403,
          );
        },
      );
      await t.test(
        "unregistered recipient without address or pin is accepted and prices come from the server",
        async () => {
          const response = await call(base, operator, draft);
          assert.equal(response.status, 201, await response.clone().text());
          document = (await response.json()) as WarehouseDispatchDocument;
          assert.equal(document.storeName, draft.storeName);
          assert.equal(document.lat, null);
          assert.equal(document.lng, null);
          assert.equal(document.address, null);
          assert.equal(document.totalAmount, "401.00");
          assert.equal(document.items[0].unitPrice, "100.25");
          assert.equal(await stock(products[0]), 96);
        },
      );
      await t.test(
        "concurrent retry credits one document and removes stock once",
        async () => {
          const replies = await Promise.all(
            Array.from({ length: 6 }, () => call(base, operator, draft)),
          );
          for (const reply of replies) {
            assert.equal(reply.status, 201);
            assert.equal(
              ((await reply.json()) as WarehouseDispatchDocument).id,
              document.id,
            );
          }
          assert.equal(await stock(products[0]), 96);
          assert.equal(
            await prisma.inventoryLedger.count({
              where: {
                referenceId: document.id,
                referenceType: "WAREHOUSE_MANUAL_DISPATCH",
              },
            }),
            1,
          );
          assert.equal(
            (await call(base, operator, { ...draft, storeName: "Changed" }))
              .status,
            409,
          );
        },
      );
      await t.test(
        "invalid location, foreign products and insufficient stock leave no partial document",
        async () => {
          assert.equal(
            (
              await call(base, operator, {
                ...draft,
                requestId: randomUUID(),
                lat: 47.9,
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await call(base, operator, {
                ...draft,
                requestId: randomUUID(),
                items: [{ productId: products[2], quantity: 1 }],
              })
            ).status,
            409,
          );
          assert.equal(
            (
              await call(base, operator, {
                ...draft,
                requestId: randomUUID(),
                items: [
                  { productId: products[0], quantity: 1 },
                  { productId: products[1], quantity: 101 },
                ],
              })
            ).status,
            409,
          );
          assert.equal(await stock(products[0]), 96);
          assert.equal(await stock(products[1]), 100);
          assert.equal(
            await prisma.warehouseManualDispatch.count({
              where: { warehouseId: own },
            }),
            1,
          );
        },
      );
      await t.test(
        "saved prices and names remain immutable; pins and recipient details appear in the document",
        async () => {
          await prisma.product.update({
            where: { id: products[0] },
            data: { name: "Renamed", price: 999 },
          });
          const detail = await call(`${base}/${document.id}`, operator);
          assert.equal(detail.status, 200);
          const row = (await detail.json()) as WarehouseDispatchDocument;
          assert.equal(row.items[0].unitPrice, "100.25");
          assert.equal(row.totalAmount, "401.00");
          assert.notEqual(row.items[0].name, "Renamed");
          assert.equal(
            (
              await call(
                `/warehouses/${other}/manual-dispatches/${document.id}`,
                operator,
              )
            ).status,
            403,
          );
          assert.equal(
            (await call(`${base}/${randomUUID()}`, operator)).status,
            404,
          );
          const pinned = await call(base, operator, {
            ...draft,
            requestId: randomUUID(),
            lat: 47.91,
            lng: 106.92,
            address: "Дэлгэрэнгүй хаяг",
          });
          assert.equal(pinned.status, 201);
          assert.equal(
            ((await pinned.json()) as WarehouseDispatchDocument).lat,
            47.91,
          );
        },
      );
      await t.test(
        "history searches recipients and paginates; legacy prices remain unknown",
        async () => {
          for (let index = 0; index < 11; index++)
            await prisma.warehouseManualDispatch.create({
              data: {
                warehouseId: own,
                createdById: operator,
                dispatchNumber: `LEGACY-${marker}-${index}`,
                address: "Old",
                lat: 47.9,
                lng: 106.9,
                items: { create: { productId: products[1], quantity: 1 } },
              },
            });
          const first = (await (
            await call(base, operator)
          ).json()) as WarehouseDispatchHistory;
          const second = (await (
            await call(`${base}?page=2`, operator)
          ).json()) as WarehouseDispatchHistory;
          assert.equal(first.total, 13);
          assert.equal(first.items.length, 10);
          assert.equal(second.items.length, 3);
          assert.equal(
            new Set([...first.items, ...second.items].map((row) => row.id))
              .size,
            13,
          );
          assert.equal(
            first.items.find((row) => row.dispatchNumber.startsWith("LEGACY"))
              ?.totalAmount,
            null,
          );
          const filtered = (await (
            await call(
              `${base}?search=${encodeURIComponent(draft.storeName)}`,
              operator,
            )
          ).json()) as WarehouseDispatchHistory;
          assert.equal(filtered.total, 2);
        },
      );
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await prisma.inventoryLedger.deleteMany({
        where: { warehouseId: { in: warehouses } },
      });
      await prisma.warehouseManualDispatchItem.deleteMany({
        where: { dispatch: { warehouseId: { in: warehouses } } },
      });
      await prisma.warehouseManualDispatch.deleteMany({
        where: { warehouseId: { in: warehouses } },
      });
      await prisma.warehouseInventory.deleteMany({
        where: { warehouseId: { in: warehouses } },
      });
      await prisma.product.deleteMany({ where: { id: { in: products } } });
      await prisma.warehouseViewer.deleteMany({
        where: { warehouseId: { in: warehouses } },
      });
      await prisma.warehouseSetupToken.deleteMany({
        where: { warehouseId: { in: warehouses } },
      });
      await prisma.warehouse.deleteMany({ where: { id: { in: warehouses } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      await prisma.$disconnect();
    }
  },
);
