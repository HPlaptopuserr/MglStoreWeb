import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { prisma } from "@mgl/database";
import {
  emptyStoreMiniAppSettings,
  STORE_MINI_APP_SETTINGS_KEY,
} from "@mgl/types";
import {
  createRetailCheckout,
  createRetailInvoice,
  checkRetailPayment,
} from "./warehouse-retail.service";
import { canReserveStock, reservedStock } from "./stock-reservation.service";
const url = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled =
  process.env.WAREHOUSE_RETAIL_INTEGRATION === "1" &&
  ["127.0.0.1", "localhost"].includes(url.hostname) &&
  url.pathname.startsWith("/wms_test_");
test(
  "warehouse retail: ownership, idempotency, concurrent stock, Minu recipient, paid-once and customer isolation",
  { skip: !enabled },
  async () => {
    let invoiceCalls = 0;
    let paid = false;
    const gateway = createServer(async (req, res) => {
      let body = "";
      for await (const chunk of req) body += String(chunk);
      const payload = JSON.parse(body || "{}") as Record<string, unknown>;
      res.setHeader("Content-Type", "application/json");
      if (req.url?.endsWith("/login")) {
        assert.equal(payload.username, "retail-test");
        res.end(JSON.stringify({ status: "000", entity: "test-token" }));
      } else if (req.url?.endsWith("/createInvoice")) {
        invoiceCalls++;
        assert.equal(payload.merchantCode, "retail-merchant");
        assert.equal(payload.amount, 10000);
        res.end(
          JSON.stringify({
            status: "000",
            entity: {
              invoiceNumber: `invoice-${invoiceCalls}`,
              mainQr: "TEST-QR",
              deeplinkList: [],
            },
          }),
        );
      } else if (req.url?.endsWith("/checkInvoice")) {
        assert.equal(payload.merchantCode, "retail-merchant");
        res.end(
          JSON.stringify({
            status: "000",
            entity: { status: paid ? "000" : null },
          }),
        );
      } else {
        res.statusCode = 404;
        res.end("{}");
      }
    });
    gateway.listen(0, "127.0.0.1");
    await once(gateway, "listening");
    const address = gateway.address();
    assert.ok(address && typeof address !== "string");
    process.env.SYSTEMQR_BASE_URL = `http://127.0.0.1:${address.port}/qrpay`;
    process.env.SYSTEMQR_DEEPLINK_URL = `http://127.0.0.1:${address.port}/deeplink`;
    const marker = randomUUID();
    try {
      const [buyer, other] = await Promise.all(
        ["buyer", "other"].map((name) =>
          prisma.user.create({
            data: { email: `${name}-${marker}@retail.test` },
          }),
        ),
      );
      const warehouse = await prisma.warehouse.create({
        data: {
          name: `Retail ${marker}`,
          address: "Test address",
          paymentAccountId: "test-account",
        },
      });
      const foreignWarehouse = await prisma.warehouse.create({
        data: { name: `Foreign ${marker}`, address: "Test address" },
      });
      const config = emptyStoreMiniAppSettings();
      config["shared-store"] = {
        enabled: true,
        sourceIds: [warehouse.id],
        allowedPhones: [],
      };
      for (const [key, value] of [
        [
          STORE_MINI_APP_SETTINGS_KEY,
          JSON.stringify({ settings: config, grants: [] }),
        ],
        ["web-products-enabled", "true"],
        [
          "contract-payment-accounts",
          JSON.stringify([
            {
              id: "test-account",
              merchantCode: "retail-merchant",
              username: "retail-test",
              password: "synthetic-only",
            },
          ]),
        ],
      ])
        await prisma.siteSetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        });
      const product = await prisma.product.create({
        data: {
          name: "Retail test product",
          price: 5000,
          costPrice: 3000,
          unit: "ш",
          stock: 5,
          managedByWarehouseId: warehouse.id,
          warehouseInventories: {
            create: { warehouseId: warehouse.id, quantity: 5, showOnWeb: true },
          },
        },
      });
      const foreign = await prisma.product.create({
        data: {
          name: "Foreign product",
          price: 5000,
          managedByWarehouseId: foreignWarehouse.id,
        },
      });
      const payload = (
        productId = product.id,
        quantity = 2,
        checkoutKey = randomUUID(),
      ) => ({
        checkoutKey,
        phone: "99112233",
        shippingAddress: "Test shipping address",
        lines: [{ productId, quantity }],
      });
      await assert.rejects(createRetailCheckout(buyer.id, payload(foreign.id)));
      await prisma.warehouseInventory.update({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: product.id,
          },
        },
        data: { showOnWeb: false },
      });
      await assert.rejects(createRetailCheckout(buyer.id, payload()));
      await prisma.warehouseInventory.update({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: product.id,
          },
        },
        data: { showOnWeb: true },
      });
      const request = payload();
      const [first, repeated] = await Promise.all([
        createRetailCheckout(buyer.id, request),
        createRetailCheckout(buyer.id, request),
      ]);
      assert.equal(first.id, repeated.id);
      assert.equal(Number(first.total), 10000);
      assert.equal(Number(first.items[0].costPrice), 3000);
      assert.equal(
        (await reservedStock(warehouse.id, [product.id])).get(product.id),
        2,
      );
      const procurementPossible = await prisma.$transaction((tx) =>
        canReserveStock(tx, warehouse.id, [
          { productId: product.id, quantity: 4 },
        ]),
      );
      assert.equal(procurementPossible, false);
      const concurrent = await Promise.allSettled([
        createRetailCheckout(buyer.id, payload(product.id, 2)),
        createRetailCheckout(other.id, payload(product.id, 2)),
      ]);
      assert.equal(
        concurrent.filter((result) => result.status === "fulfilled").length,
        1,
      );
      const second = concurrent.find((result) => result.status === "fulfilled");
      assert.ok(second?.status === "fulfilled");
      await prisma.warehouseRetailOrder.update({
        where: { id: second.value.id },
        data: { expiresAt: new Date(0) },
      });
      await assert.rejects(createRetailInvoice(first.id, other.id));
      const [invoice, retried] = await Promise.all([
        createRetailInvoice(first.id, buyer.id),
        createRetailInvoice(first.id, buyer.id),
      ]);
      assert.equal(invoice.invoiceId, retried.invoiceId);
      assert.equal(invoiceCalls, 1);
      assert.equal(
        (await checkRetailPayment(first.id, buyer.id)).paymentStatus,
        "PENDING",
      );
      paid = true;
      const confirmations = await Promise.all([
        checkRetailPayment(first.id, buyer.id),
        checkRetailPayment(first.id, buyer.id),
      ]);
      assert.ok(
        confirmations.every(
          (order) =>
            order.paymentStatus === "PAID" && order.status === "CONFIRMED",
        ),
      );
      const stock = await prisma.warehouseInventory.findUniqueOrThrow({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: product.id,
          },
        },
      });
      assert.equal(stock.quantity, 3);
      assert.equal(
        await prisma.inventoryLedger.count({
          where: {
            referenceId: first.id,
            referenceType: "WAREHOUSE_RETAIL_ORDER",
          },
        }),
        1,
      );
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
          .organizationId,
        null,
      );
      assert.equal(
        (await reservedStock(warehouse.id, [product.id])).get(product.id) ?? 0,
        0,
      );
      // A paid invoice arriving after expiry is retained for manual resolution if other buyers reserved stock.
      await prisma.warehouseRetailOrder.update({
        where: { id: second.value.id },
        data: { invoiceId: "late-invoice", merchantCode: "retail-merchant" },
      });
      await createRetailCheckout(other.id, payload(product.id, 3));
      const late = await checkRetailPayment(
        second.value.id,
        second.value.customerId,
      );
      assert.equal(late.paymentStatus, "PAID");
      assert.equal(late.status, "PENDING");
      assert.ok(late.fulfillmentIssue);
      assert.equal(
        (
          await prisma.warehouseInventory.findUniqueOrThrow({
            where: {
              warehouseId_productId: {
                warehouseId: warehouse.id,
                productId: product.id,
              },
            },
          })
        ).quantity,
        3,
      );
    } finally {
      gateway.close();
      await prisma.$disconnect();
    }
  },
);
