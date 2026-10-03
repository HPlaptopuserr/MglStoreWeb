import assert from "node:assert/strict";
import crypto from "node:crypto";
import * as XLSX from "xlsx";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import warehousesRouter from "./warehouses.routes";
import receiptsRouter from "./warehouse-goods-receipts.routes";

// Opt in using a disposable local DB populated with the current Prisma schema.
const databaseUrl = process.env.WAREHOUSE_TEST_DATABASE_URL;
const isolated =
  databaseUrl &&
  databaseUrl === process.env.DATABASE_URL &&
  new URL(databaseUrl).hostname === "localhost" &&
  new URL(databaseUrl).pathname.startsWith("/wms_test_");

test(
  "an unassigned warehouse can create, search, receive and dispatch its own products",
  {
    skip: !isolated,
  },
  async () => {
    const suffix = crypto.randomUUID();
    const user = await prisma.user.create({
      data: { email: `${suffix}@test.invalid` },
    });
    const warehouse = await prisma.warehouse.create({
      data: { name: "Байгууллагагүй агуулах", address: "Тест" },
    });
    const other = await prisma.warehouse.create({
      data: { name: "Өөр агуулах", address: "Тест" },
    });
    await prisma.warehouseSetupToken.create({
      data: {
        userId: user.id,
        warehouseId: warehouse.id,
        token: suffix,
        usedAt: new Date(),
        expiresAt: new Date(),
      },
    });
    const token = jwt.sign(
      { userId: user.id, role: "USER" },
      process.env.JWT_SECRET || "dev-secret-change-me",
    );
    const app = express();
    app.use(express.json(), warehousesRouter, receiptsRouter);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const call = (path: string, data?: object) =>
      fetch(`${base}${path}`, {
        method: data ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
      });
    try {
      const input = {
        name: "Цагаан будаа",
        sku: `RICE-${suffix}`,
        barcode: suffix,
        price: 2000,
        costPrice: 1000,
        quantity: 0,
      };
      const create = await call(`/warehouses/${warehouse.id}/products`, input);
      assert.equal(create.status, 201, await create.clone().text());
      const product = (await create.json()) as {
        id: string;
        organizationId: string | null;
        managedByWarehouseId: string;
      };
      assert.equal(product.organizationId, null);
      assert.equal(product.managedByWarehouseId, warehouse.id);
      await assert.rejects(
        prisma.product.create({
          data: {
            name: "Давхардсан SKU",
            price: 2000,
            sku: input.sku,
            managedByWarehouseId: warehouse.id,
          },
        }),
        { code: "P2002" },
      );
      assert.equal(
        (await call(`/warehouses/${warehouse.id}/products`, input)).status,
        409,
      );
      const search = await call(
        `/warehouses/${warehouse.id}/products?search=${encodeURIComponent(input.barcode)}`,
      );
      assert.equal(search.status, 200);
      assert.equal(
        ((await search.json()) as { id: string }[])[0]?.id,
        product.id,
      );
      const skuSearch = await call(
        `/warehouses/${warehouse.id}/sku-lookup?prefix=${encodeURIComponent(input.sku)}`,
      );
      assert.equal(skuSearch.status, 200);
      assert.equal(
        ((await skuSearch.json()) as { id: string }[])[0]?.id,
        product.id,
      );
      // Unassigned does not mean public: another warehouse's catalog remains protected.
      assert.equal(
        (await call(`/warehouses/${other.id}/products`)).status,
        403,
      );
      await prisma.warehouseSetupToken.create({
        data: {
          userId: user.id,
          warehouseId: other.id,
          token: `${suffix}-other`,
          usedAt: new Date(),
          expiresAt: new Date(),
        },
      });
      assert.equal(
        (
          await call(
            `/warehouses/${other.id}/products?search=${encodeURIComponent(input.sku)}`,
          )
        ).status,
        200,
      );
      const otherSearch = await call(
        `/warehouses/${other.id}/products?search=${encodeURIComponent(input.sku)}`,
      );
      assert.deepEqual(await otherSearch.json(), []);
      assert.equal(
        (await call(`/warehouses/${other.id}/products`, input)).status,
        201,
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet([
          {
            name: "Импортын бараа",
            sku: `IMPORT-${suffix}`,
            price: 3000,
            stock: 2,
          },
        ]),
        "Products",
      );
      const bytes = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      }) as Buffer;
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(bytes)]), "products.xlsx");
      const imported = await fetch(
        `${base}/warehouses/${warehouse.id}/products/import`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        },
      );
      assert.equal(imported.status, 200, await imported.clone().text());
      const importResult = (await imported.json()) as {
        created: number;
        errors: string[];
      };
      assert.equal(importResult.created, 1, JSON.stringify(importResult));
      const importedProduct = await prisma.product.findFirst({
        where: { managedByWarehouseId: warehouse.id, sku: `IMPORT-${suffix}` },
      });
      assert.equal(importedProduct?.organizationId, null);
      const receipt = await call("/warehouse-goods-receipts", {
        warehouseId: warehouse.id,
        supplierName: "Нийлүүлэгч",
        confirm: true,
        items: [{ productId: product.id, quantity: 10, unitCost: 1000 }],
      });
      assert.equal(receipt.status, 201, await receipt.clone().text());
      const dispatch = await call(
        `/warehouses/${warehouse.id}/manual-dispatches`,
        {
          address: "Хүлээн авах хаяг",
          lat: 47.9,
          lng: 106.9,
          items: [{ productId: product.id, quantity: 3 }],
        },
      );
      assert.equal(dispatch.status, 201, await dispatch.clone().text());
      const inventory = await prisma.warehouseInventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: product.id,
          },
        },
      });
      assert.equal(inventory?.quantity, 7);
      assert.equal(
        await prisma.warehouseOrganization.count({
          where: { warehouseId: warehouse.id },
        }),
        0,
      );
    } finally {
      server.closeAllConnections();
      server.close();
      await prisma.$disconnect();
    }
  },
);
