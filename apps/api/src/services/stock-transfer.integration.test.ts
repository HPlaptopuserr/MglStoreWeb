import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test, { type TestContext } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import {
  transferStockToVendor,
  StockTransferConflictError,
} from "./stock-transfer.service";
import {
  adjustStock,
  resolveOrgWarehouse,
  syncProductStock,
} from "./inventory.service";
import {
  approveDispatchReturn,
  createDispatchReturn,
} from "./dispatch-return.service";
import deliveriesRouter from "../routes/operations/deliveries.routes";
import { lockOrganizationInventory } from "./vendor-inventory-warehouse.service";

const url = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled =
  process.env.STORE_ISOLATION_INTEGRATION === "1" &&
  url.hostname === "localhost" &&
  url.pathname.startsWith("/wms_test_");

async function fixture(t: TestContext) {
  const key = randomUUID();
  const stores = await Promise.all(
    ["a", "b"].map((suffix) =>
      prisma.organization.create({
        data: {
          name: `Transfer ${suffix}`,
          slug: `${key}-${suffix}`,
          taxId: `${key}-${suffix}`,
          businessDeliveryEnabled: true,
        },
      }),
    ),
  );
  const driver = await prisma.user.create({
    data: { email: `${key}@test.invalid` },
  });
  await prisma.organizationMember.create({
    data: {
      organizationId: stores[0].id,
      userId: driver.id,
      role: "OWNER",
      capabilities: ["DELIVERY_DRIVER"],
    },
  });
  const central = await prisma.warehouse.create({
    data: { name: key, address: "Test", type: "CENTRAL" },
  });
  const source = await prisma.product.create({
    data: {
      name: "Warehouse juice",
      managedByWarehouseId: central.id,
      barcode: key,
      price: 1000,
      costPrice: 800,
      stock: 90,
      unit: "pcs",
      warehouseInventories: {
        create: { warehouseId: central.id, quantity: 90 },
      },
    },
  });
  const products = await Promise.all(
    stores.map((organization) =>
      prisma.product.create({
        data: {
          organizationId: organization.id,
          name: "Store juice",
          barcode: key,
          price: 4800,
          costPrice: 3640,
          stock: 6,
          unit: "pcs",
        },
      }),
    ),
  );
  const request = await prisma.warehouseStockRequest.create({
    data: {
      organizationId: stores[0].id,
      warehouseId: central.id,
      requestNumber: key,
      requestedById: driver.id,
      status: "PROCESSING",
      items: {
        create: { productId: source.id, quantity: 10, approvedQuantity: 10 },
      },
    },
    include: { items: true },
  });
  const dispatch = await prisma.stockDispatch.create({
    data: {
      requestId: request.id,
      organizationId: stores[0].id,
      warehouseId: central.id,
      dispatchNumber: key,
      status: "DELIVERED",
    },
  });
  await prisma.stockRequestPayment.create({
    data: {
      requestId: request.id,
      organizationId: stores[0].id,
      invoiceNumber: key,
      totalAmount: 10000,
    },
  });
  const organizationIds = stores.map((store) => store.id);
  t.after(async () => {
    const productWhere = {
      OR: [
        { organizationId: { in: organizationIds } },
        { managedByWarehouseId: central.id },
      ],
    };
    const internal = await prisma.warehouse.findMany({
      where: {
        organizations: { some: { organizationId: { in: organizationIds } } },
      },
      select: { id: true },
    });
    await prisma.dispatchReturnItem.deleteMany({
      where: { return: { organizationId: { in: organizationIds } } },
    });
    await prisma.dispatchReturn.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await prisma.delivery.deleteMany({
      where: { stockDispatch: { organizationId: { in: organizationIds } } },
    });
    await prisma.stockDispatch.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await prisma.warehouseStockRequest.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await prisma.inventoryLedger.deleteMany({
      where: { product: productWhere },
    });
    await prisma.warehouseInventory.deleteMany({
      where: { product: productWhere },
    });
    await prisma.product.deleteMany({ where: productWhere });
    await prisma.warehouseOrganization.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await prisma.warehouse.deleteMany({
      where: {
        id: { in: [central.id, ...internal.map((warehouse) => warehouse.id)] },
      },
    });
    await prisma.organizationMember.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await prisma.user.delete({ where: { id: driver.id } });
    await prisma.organization.deleteMany({
      where: { id: { in: organizationIds } },
    });
  });
  return { key, stores, driver, central, source, products, request, dispatch };
}

test(
  "concurrent receipts and returns preserve canonical stock through later POS sync and keep store prices",
  { skip: !enabled },
  async (t) => {
    const f = await fixture(t);
    await Promise.all(
      [1, 2].map(() =>
        prisma.$transaction((tx) =>
          transferStockToVendor(tx, f.request, f.request.items),
        ),
      ),
    );
    let store = await prisma.product.findUniqueOrThrow({
      where: { id: f.products[0].id },
    });
    assert.equal(store.stock, 16);
    assert.equal(Number(store.price), 4800);
    assert.equal(Number(store.costPrice), 3640);
    assert.equal(
      await prisma.product.count({ where: { organizationId: f.stores[0].id } }),
      1,
    );
    await prisma.$transaction(async (tx) => {
      const warehouseId = await resolveOrgWarehouse(
        tx,
        f.stores[0].id,
        store.id,
      );
      await adjustStock(tx, {
        productId: store.id,
        warehouseId: warehouseId ?? undefined,
        change: -2,
        reason: "ORDER",
        referenceType: "POS_SALE",
        referenceId: randomUUID(),
      });
      await syncProductStock(tx, store.id);
    });
    const returns = await Promise.allSettled(
      [1, 2].map(() =>
        prisma.$transaction((tx) =>
          createDispatchReturn(tx, f.dispatch.id, {
            items: [{ productId: f.source.id, quantity: 6 }],
          }),
        ),
      ),
    );
    assert.equal(
      returns.filter((result) => result.status === "fulfilled").length,
      1,
    );
    const record = await prisma.dispatchReturn.findFirstOrThrow({
      where: { dispatchId: f.dispatch.id },
    });
    const approvals = await Promise.allSettled(
      [1, 2].map(() =>
        prisma.$transaction((tx) =>
          approveDispatchReturn(tx, record.id, f.driver.id),
        ),
      ),
    );
    assert.equal(
      approvals.filter((result) => result.status === "fulfilled").length,
      1,
    );
    await prisma.$transaction(async (tx) => {
      const warehouseId = await resolveOrgWarehouse(
        tx,
        f.stores[0].id,
        store.id,
      );
      await adjustStock(tx, {
        productId: store.id,
        warehouseId: warehouseId ?? undefined,
        change: -1,
        reason: "ORDER",
      });
      await syncProductStock(tx, store.id);
    });
    store = await prisma.product.findUniqueOrThrow({ where: { id: store.id } });
    assert.equal(store.stock, 7); // 6 + 10 received - 2 sold - 6 returned - 1 sold
    assert.equal(Number(store.price), 4800);
    assert.equal(
      (await prisma.product.findUniqueOrThrow({ where: { id: f.source.id } }))
        .stock,
      96,
    );
    assert.equal(
      (
        await prisma.product.findUniqueOrThrow({
          where: { id: f.products[1].id },
        })
      ).stock,
      6,
    );
    const inventory = await prisma.warehouseInventory.findFirstOrThrow({
      where: { productId: store.id },
    });
    assert.equal(inventory.quantity, 7);
    assert.equal(
      await prisma.inventoryLedger.count({
        where: { productId: store.id, referenceType: "STOCK_REQUEST_TRANSFER" },
      }),
      1,
    );
    const invoice = await prisma.stockRequestPayment.findUniqueOrThrow({
      where: { requestId: f.request.id },
    });
    assert.equal(Number(invoice.totalAmount), 4000);
    const unavailable = await prisma.$transaction((tx) =>
      createDispatchReturn(tx, f.dispatch.id, {
        items: [{ productId: f.source.id, quantity: 4 }],
      }),
    );
    await prisma.$transaction(async (tx) => {
      const warehouseId = await resolveOrgWarehouse(
        tx,
        f.stores[0].id,
        store.id,
      );
      await adjustStock(tx, {
        productId: store.id,
        warehouseId: warehouseId ?? undefined,
        change: -6,
        reason: "ORDER",
      });
    });
    await assert.rejects(
      prisma.$transaction((tx) =>
        approveDispatchReturn(tx, unavailable.id, f.driver.id),
      ),
      /VENDOR_STOCK_INSUFFICIENT/,
    );
    assert.equal(
      (await prisma.product.findUniqueOrThrow({ where: { id: f.source.id } }))
        .stock,
      96,
    );
    assert.equal(
      (
        await prisma.dispatchReturn.findUniqueOrThrow({
          where: { id: unavailable.id },
        })
      ).status,
      "PENDING",
    );
    assert.equal(
      Number(
        (
          await prisma.stockRequestPayment.findUniqueOrThrow({
            where: { requestId: f.request.id },
          })
        ).totalAmount,
      ),
      4000,
    );
    assert.equal(
      await prisma.inventoryLedger.count({
        where: { productId: store.id, referenceType: "DISPATCH_RETURN" },
      }),
      1,
    );
  },
);

test(
  "missing identifiers get stable store identity and ambiguous barcodes never select an arbitrary product",
  { skip: !enabled },
  async (t) => {
    const f = await fixture(t);
    await prisma.product.create({
      data: {
        organizationId: f.stores[0].id,
        name: "Duplicate barcode",
        barcode: f.key,
        price: 9,
        unit: "pcs",
      },
    });
    await assert.rejects(
      prisma.$transaction((tx) =>
        transferStockToVendor(tx, f.request, f.request.items),
      ),
      StockTransferConflictError,
    );
    assert.equal(
      (
        await prisma.product.findUniqueOrThrow({
          where: { id: f.products[0].id },
        })
      ).stock,
      6,
    );
    const source = await prisma.product.create({
      data: {
        name: "No identifiers",
        managedByWarehouseId: f.central.id,
        price: 3,
        unit: "pcs",
      },
    });
    for (const number of [1, 2]) {
      await prisma.$transaction((tx) =>
        transferStockToVendor(
          tx,
          {
            organizationId: f.stores[0].id,
            requestNumber: `${f.key}-${number}`,
          },
          [{ productId: source.id, quantity: 2, approvedQuantity: null }],
        ),
      );
    }
    const targets = await prisma.product.findMany({
      where: { organizationId: f.stores[0].id, sku: `transfer-${source.id}` },
    });
    assert.equal(targets.length, 1);
    assert.equal(targets[0].stock, 4);
  },
);

test(
  "concurrent delivery completion transfers once and preserves canonical stock on the next POS sale",
  { skip: !enabled },
  async (t) => {
    const f = await fixture(t);
    await prisma.stockDispatch.update({
      where: { id: f.dispatch.id },
      data: { status: "DISPATCHED" },
    });
    const delivery = await prisma.delivery.create({
      data: {
        stockDispatchId: f.dispatch.id,
        courierId: f.driver.id,
        status: "DELIVERING",
        proofImage: "/test-proof.jpg",
      },
    });
    const app = express();
    app.use(express.json(), deliveriesRouter);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => {
      server.close();
    });
    const token = jwt.sign(
      { userId: f.driver.id, role: "USER" },
      process.env.JWT_SECRET || "dev-secret-change-me",
    );
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const results = await Promise.all(
      [1, 2].map(async () => {
        const response = await fetch(
          `${base}/deliveries/${delivery.id}/status`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "COMPLETED" }),
          },
        );
        return { status: response.status, body: await response.text() };
      }),
    );
    assert.deepEqual(
      results.map((result) => result.status).sort(),
      [200, 409],
      JSON.stringify(results),
    );
    assert.equal(
      (
        await prisma.product.findUniqueOrThrow({
          where: { id: f.products[0].id },
        })
      ).stock,
      16,
    );
    await prisma.$transaction(async (tx) => {
      const warehouseId = await resolveOrgWarehouse(
        tx,
        f.stores[0].id,
        f.products[0].id,
      );
      await adjustStock(tx, {
        productId: f.products[0].id,
        warehouseId: warehouseId ?? undefined,
        change: -1,
        reason: "ORDER",
      });
    });
    assert.equal(
      (
        await prisma.product.findUniqueOrThrow({
          where: { id: f.products[0].id },
        })
      ).stock,
      15,
    );
  },
);

test(
  "concurrent transfer and POS stock transaction serialize without losing either movement",
  { skip: !enabled },
  async (t) => {
    const f = await fixture(t);
    await Promise.all([
      prisma.$transaction((tx) =>
        transferStockToVendor(tx, f.request, f.request.items),
      ),
      prisma.$transaction(async (tx) => {
        await lockOrganizationInventory(tx, f.stores[0].id);
        await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${f.products[0].id} FOR UPDATE`;
        const current = await tx.product.findUniqueOrThrow({
          where: { id: f.products[0].id },
        });
        assert.ok(current.stock >= 2);
        const warehouseId = await resolveOrgWarehouse(
          tx,
          f.stores[0].id,
          current.id,
        );
        await adjustStock(tx, {
          productId: current.id,
          warehouseId: warehouseId ?? undefined,
          change: -2,
          reason: "ORDER",
          referenceType: "POS_SALE",
          referenceId: randomUUID(),
        });
      }),
    ]);
    const store = await prisma.product.findUniqueOrThrow({
      where: { id: f.products[0].id },
    });
    const inventory = await prisma.warehouseInventory.findFirstOrThrow({
      where: { productId: store.id },
    });
    assert.equal(store.stock, 14);
    assert.equal(inventory.quantity, 14);
    assert.equal(Number(store.price), 4800);
    assert.equal(
      (
        await prisma.product.findUniqueOrThrow({
          where: { id: f.products[1].id },
        })
      ).stock,
      6,
    );
  },
);
