import "../config/env";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import express from "express";
import { once } from "node:events";
import stocktakes from "../routes/operations/pos/stocktakes.routes";
import receipts from "../routes/operations/pos/goods-receipts.routes";
import restocks from "../routes/operations/pos/quick-restock.routes";
import { prisma } from "@mgl/database";
import type { StocktakeDetail } from "@mgl/types";

const enabled =
  process.env.STOCKTAKE_LOCAL_HTTP_TEST === "1" &&
  /^postgresql:\/\/[^@]+@(127\.0\.0\.1|localhost):5432\//.test(
    process.env.DATABASE_URL || "",
  );

test(
  "local HTTP: new stocktake goods, receipts, rollback, retry and warehouse stock",
  { skip: !enabled },
  async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", stocktakes, receipts, restocks);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: { email: `stocktake-new-${suffix}@example.invalid` },
    });
    const org = await prisma.organization.create({
      data: { name: "[TEST] New stocktake", slug: suffix, taxId: suffix },
    });
    let warehouseId = "";
    try {
      await prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: "OWNER",
          isPrimary: true,
        },
      });
      const branch = await prisma.branch.create({
        data: { organizationId: org.id, name: "Test", address: "Test" },
      });
      const register = await prisma.posRegister.create({
        data: {
          organizationId: org.id,
          branchId: branch.id,
          name: "Test",
          isActive: true,
        },
      });
      const warehouse = await prisma.warehouse.create({
        data: {
          name: "Test",
          address: "Test",
          type: "VENDOR_INTERNAL",
          organizations: { create: { organizationId: org.id } },
        },
      });
      warehouseId = warehouse.id;
      const headers = {
        Authorization:
          "Bearer " +
          jwt.sign(
            { userId: user.id, organizationId: org.id },
            process.env.JWT_SECRET || "dev-secret-change-me",
            { expiresIn: "5m" },
          ),
        "Content-Type": "application/json",
      };
      const base = `${origin}/api/pos/stocktakes/${org.id}`;
      async function request(
        path: string,
        method: string,
        body: unknown,
        status = 200,
      ): Promise<StocktakeDetail> {
        const response = await fetch(base + path, {
          method,
          headers,
          body: JSON.stringify(body),
        });
        const data = await response.json();
        assert.equal(response.status, status, JSON.stringify(data));
        return data as StocktakeDetail;
      }
      for (const scope of [null, warehouse.id]) {
        await prisma.product.create({
          data: {
            name: "Existing",
            organizationId: org.id,
            price: 10,
            ...(scope
              ? {
                  warehouseInventories: {
                    create: { warehouseId: scope, quantity: 0 },
                  },
                }
              : {}),
          },
        });
        let session = await request(
          "",
          "POST",
          {
            id: randomUUID(),
            title: "Test receipt",
            kind: "PARTIAL",
            warehouseId: scope,
          },
          201,
        );
        const product = {
          id: randomUUID(),
          name: "New",
          barcode: randomUUID(),
          unit: scope ? "kg" : "pcs",
          quantity: scope ? 1.025 : 7,
          unitCost: 100,
          salePrice: 200,
          registerId: register.id,
        };
        const expected = scope ? 1025 : 7;
        const beforeRegistration = Date.now();
        const body = { product, version: session.version };
        session = await request(`/${session.id}/products`, "POST", body);
        const retry = await request(`/${session.id}/products`, "POST", body);
        assert.equal(retry.version, session.version);
        assert.equal(
          session.lines.filter((line) => line.productId === product.id).length,
          1,
        );
        assert.equal(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: product.id },
            })
          ).stock,
          expected,
        );
        assert.equal(
          await prisma.posGoodsReceipt.count({
            where: { documentNo: session.id },
          }),
          1,
        );
        const receipt = await prisma.posGoodsReceipt.findFirstOrThrow({
          where: { documentNo: session.id },
        });
        assert.ok(receipt.receivedAt.getTime() >= beforeRegistration);
        assert.ok(receipt.receivedAt.getTime() <= Date.now());
        assert.equal(
          session.lines.find((line) => line.productId === product.id)?.expected,
          expected,
        );
        await request(
          `/${session.id}/products`,
          "POST",
          {
            version: session.version,
            product: { ...product, id: randomUUID() },
          },
          409,
        );
        await request(
          `/${session.id}/products`,
          "POST",
          {
            version: session.version,
            product: {
              ...product,
              id: randomUUID(),
              barcode: "",
              registerId: randomUUID(),
            },
          },
          400,
        );
        // Refresh after metadata changes preserves receipt provenance while requiring a recount.
        await prisma.product.update({
          where: { id: product.id },
          data: { description: "Updated during count" },
        });
        if (!scope) {
          session = await request(`/${session.id}`, "PATCH", {
            action: "refresh",
            version: session.version,
          });
          const line = session.lines.find(
            (row) => row.productId === product.id,
          )!;
          assert.equal(line.receiptRegisterId, register.id);
          assert.equal(line.counted, null);
          session = await request(`/${session.id}`, "PATCH", {
            action: "save",
            version: session.version,
            edits: [{ id: line.id, counted: 7, note: "Recount" }],
          });
        }
        session = await request(`/${session.id}`, "PATCH", {
          action: "submit",
          version: session.version,
        });
        // Receiving already succeeded; approval must not receive again, even if the register closes.
        await prisma.posRegister.update({
          where: { id: register.id },
          data: { isActive: false },
        });
        const approval = { action: "approve", version: session.version };
        session = await request(`/${session.id}`, "PATCH", approval);
        await request(`/${session.id}`, "PATCH", approval);
        await prisma.posRegister.update({
          where: { id: register.id },
          data: { isActive: true },
        });
        assert.equal(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: product.id },
            })
          ).stock,
          expected,
        );
        if (scope)
          assert.equal(
            (
              await prisma.warehouseInventory.findUniqueOrThrow({
                where: {
                  warehouseId_productId: {
                    warehouseId: scope,
                    productId: product.id,
                  },
                },
              })
            ).quantity,
            expected,
          );
        const receipts = await prisma.posGoodsReceipt.findMany({
          where: { documentNo: session.id },
          include: { items: true },
        });
        assert.equal(receipts.length, 1);
        assert.equal(receipts[0]!.items[0]!.quantity, expected);
        assert.equal(receipts[0]!.items[0]!.remainingQuantity, expected);
        assert.equal(
          await prisma.inventoryLedger.count({
            where: { referenceId: receipt.receiptNo, productId: product.id },
          }),
          1,
        );
        const listed = await fetch(
          `${origin}/api/pos/goods-receipts?registerId=${register.id}`,
          { headers },
        );
        assert.equal(listed.status, 200);
        const rows: { documentNo: string; items: { quantity: number }[] }[] =
          await listed.json();
        assert.equal(
          rows.find((row) => row.documentNo === session.id)?.items[0]?.quantity,
          product.quantity,
        );
      }
      // Cancelling a count does not reverse a completed goods receipt.
      let cancelled = await request(
        "",
        "POST",
        {
          id: randomUUID(),
          title: "Cancel test",
          kind: "PARTIAL",
          warehouseId: null,
        },
        201,
      );
      const cancelledId = randomUUID();
      cancelled = await request(`/${cancelled.id}/products`, "POST", {
        version: cancelled.version,
        product: {
          id: cancelledId,
          name: "Cancel",
          barcode: "",
          unit: "pcs",
          quantity: 2,
          unitCost: 1,
          salePrice: 2,
          registerId: register.id,
        },
      });
      await request(`/${cancelled.id}`, "PATCH", {
        action: "cancel",
        version: cancelled.version,
      });
      assert.equal(
        await prisma.posGoodsReceipt.count({
          where: { documentNo: cancelled.id },
        }),
        1,
      );
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: cancelledId } }))
          .stock,
        2,
      );
      // POS quick receiving must be idempotent and appear in the same receipt list.
      const restockBody = {
        requestId: randomUUID(),
        registerId: register.id,
        productId: cancelledId,
        quantity: 3,
      };
      const sendRestock = (body: unknown) =>
        fetch(`${origin}/api/pos/quick-restock`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
      const results = await Promise.all([
        sendRestock(restockBody),
        sendRestock(restockBody),
      ]);
      for (const result of results) {
        assert.equal(result.status, 200, await result.clone().text());
        assert.equal((await result.json()).stockQty, 5);
      }
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: cancelledId } }))
          .stock,
        5,
      );
      assert.equal(
        await prisma.posGoodsReceipt.count({
          where: { id: restockBody.requestId },
        }),
        1,
      );
      assert.equal(
        (await sendRestock({ ...restockBody, quantity: 4 })).status,
        409,
      );
      assert.equal(
        (
          await sendRestock({
            ...restockBody,
            requestId: randomUUID(),
            quantity: 1.5,
          })
        ).status,
        400,
      );
      assert.equal(
        (await sendRestock({ ...restockBody, registerId: randomUUID() }))
          .status,
        403,
      );
    } finally {
      await prisma.posGoodsReceipt.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.stocktake.deleteMany({ where: { organizationId: org.id } });
      await prisma.inventoryLedger.deleteMany({
        where: { product: { organizationId: org.id } },
      });
      await prisma.warehouseInventory.deleteMany({
        where: { product: { organizationId: org.id } },
      });
      await prisma.product.deleteMany({ where: { organizationId: org.id } });
      await prisma.posRegister.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.branch.deleteMany({ where: { organizationId: org.id } });
      if (warehouseId) {
        await prisma.warehouseOrganization.deleteMany({
          where: { organizationId: org.id },
        });
        await prisma.warehouse.delete({ where: { id: warehouseId } });
      }
      await prisma.organizationMember.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.organization.delete({ where: { id: org.id } });
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.$disconnect();
      server.close();
    }
  },
);
