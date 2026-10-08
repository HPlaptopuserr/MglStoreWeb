import {
  assertStocktakeScope,
  stocktakeWarehouseFilter,
} from "../stocktake-scope";
import { createStocktake } from "../stocktake.service";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import * as XLSX from "xlsx";
import { prisma } from "@mgl/database";
import warehousesRouter from "../../routes/operations/warehouses.routes";
import productsRouter from "../../routes/catalog/products.routes";
import { linkWarehouseCatalog } from "./link";
import { resolveProductInventoryWarehouse } from "../vendor-inventory-warehouse.service";
import { adjustStock } from "../inventory.service";

const url = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled =
  process.env.SHARED_CATALOG_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(url.hostname) &&
  url.pathname.startsWith("/wms_test_");

test(
  "explicit shared catalog preserves login roles and shares create/edit/stock across both portals",
  { skip: !enabled },
  async () => {
    const key = randomUUID();
    const owner = await prisma.organization.create({
      data: { name: "HyperMarket test", slug: key, taxId: key },
    });
    const recipient = await prisma.organization.create({
      data: {
        name: "Recipient",
        slug: `${key}-recipient`,
        taxId: `${key}-recipient`,
      },
    });
    const [vendor, operator, outsider] = await Promise.all(
      ["vendor", "operator", "outsider"].map((role) =>
        prisma.user.create({ data: { email: `${key}-${role}@test.invalid` } }),
      ),
    );
    await prisma.organizationMember.createMany({
      data: [
        { organizationId: owner.id, userId: vendor.id, role: "OWNER" },
        { organizationId: recipient.id, userId: outsider.id, role: "OWNER" },
      ],
    });
    const warehouse = await prisma.warehouse.create({
      data: {
        name: "Хайпер Маркет test",
        address: "test",
        organizations: { create: { organizationId: recipient.id } },
        setupTokens: {
          create: {
            userId: operator.id,
            token: key,
            usedAt: new Date(),
            expiresAt: new Date(),
          },
        },
      },
    });
    const legacyWarehouse = await prisma.warehouse.create({
      data: {
        name: "Vendor internal",
        address: "test",
        type: "VENDOR_INTERNAL",
        organizations: { create: { organizationId: owner.id } },
      },
    });
    const original = await prisma.product.create({
      data: {
        name: "Original warehouse stock",
        organizationId: recipient.id,
        managedByWarehouseId: warehouse.id,
        price: 100,
        stock: 7,
        sku: `${key}-old`,
        warehouseInventories: {
          create: { warehouseId: warehouse.id, quantity: 7 },
        },
      },
    });
    const vendorProduct = await prisma.product.create({
      data: {
        name: "Vendor stock",
        organizationId: owner.id,
        price: 20,
        stock: 4,
        sku: `${key}-vendor`,
        warehouseInventories: {
          create: { warehouseId: legacyWarehouse.id, quantity: 4 },
        },
      },
    });
    const recipientProduct = await prisma.product.create({
      data: {
        name: "Recipient private stock",
        organizationId: recipient.id,
        price: 50,
      },
    });
    const token = (id: string) =>
      jwt.sign(
        { userId: id, role: "USER" },
        process.env.JWT_SECRET || "dev-secret-change-me",
      );
    const app = express();
    app.use(express.json(), warehousesRouter, productsRouter);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const call = (id: string, path: string, method = "GET", data?: object) =>
      fetch(`${base}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token(id)}`,
          "Content-Type": "application/json",
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
      });
    try {
      const beforeTokens = await prisma.warehouseSetupToken.findMany({
        where: { warehouseId: warehouse.id },
      });
      const beforeAssignments = await prisma.warehouseOrganization.findMany({
        where: { warehouseId: warehouse.id },
      });
      const duplicate = await prisma.product.create({
        data: {
          organizationId: owner.id,
          name: "Duplicate",
          price: 1,
          sku: original.sku,
        },
      });
      await assert.rejects(
        linkWarehouseCatalog({
          warehouseId: warehouse.id,
          organizationId: owner.id,
          apply: true,
        }),
        /Давхардсан/,
      );
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: original.id } }))
          .organizationId,
        recipient.id,
      );
      assert.equal(
        (
          await prisma.warehouse.findUniqueOrThrow({
            where: { id: warehouse.id },
          })
        ).catalogOrganizationId,
        null,
      );
      await prisma.product.delete({ where: { id: duplicate.id } });
      const count = await prisma.stocktake.create({
        data: {
          organizationId: owner.id,
          warehouseId: legacyWarehouse.id,
          title: "Active count",
          kind: "FULL",
          createdById: vendor.id,
        },
      });
      await assert.rejects(
        linkWarehouseCatalog({
          warehouseId: warehouse.id,
          organizationId: owner.id,
          apply: true,
        }),
        /тооллого/,
      );
      await prisma.stocktake.delete({ where: { id: count.id } });
      const preview = await linkWarehouseCatalog({
        warehouseId: warehouse.id,
        organizationId: owner.id,
      });
      assert.equal(preview.productCount, 2);
      assert.equal(preview.movedInventoryCount, 1);
      assert.equal(
        (
          await prisma.warehouse.findUniqueOrThrow({
            where: { id: warehouse.id },
          })
        ).catalogOrganizationId,
        null,
      );
      await linkWarehouseCatalog({
        warehouseId: warehouse.id,
        organizationId: owner.id,
        apply: true,
      });
      const auditBefore = await prisma.auditLog.findUniqueOrThrow({
        where: { id: `warehouse-catalog-link:${warehouse.id}` },
      });
      const ledgers = await prisma.inventoryLedger.count({
        where: { referenceId: warehouse.id },
      });
      await linkWarehouseCatalog({
        warehouseId: warehouse.id,
        organizationId: owner.id,
        apply: true,
      });
      assert.equal(
        await prisma.inventoryLedger.count({
          where: { referenceId: warehouse.id },
        }),
        ledgers,
      );
      assert.deepEqual(
        await prisma.warehouseSetupToken.findMany({
          where: { warehouseId: warehouse.id },
        }),
        beforeTokens,
      );
      assert.deepEqual(
        await prisma.warehouseOrganization.findMany({
          where: { warehouseId: warehouse.id },
        }),
        beforeAssignments,
      );
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: original.id } }))
          .organizationId,
        owner.id,
      );
      assert.equal(
        (
          await prisma.product.findUniqueOrThrow({
            where: { id: recipientProduct.id },
          })
        ).organizationId,
        recipient.id,
      );
      assert.equal(
        (
          await prisma.warehouseInventory.findFirstOrThrow({
            where: { productId: vendorProduct.id },
          })
        ).warehouseId,
        warehouse.id,
      );

      const createdResponse = await call(
        operator.id,
        `/warehouses/${warehouse.id}/products`,
        "POST",
        {
          name: `Operator product ${key}`,
          sku: `${key}-operator`,
          price: 1000,
          quantity: 8,
        },
      );
      assert.equal(
        createdResponse.status,
        201,
        await createdResponse.clone().text(),
      );
      const created = (await createdResponse.json()) as {
        id: string;
        organizationId: string;
      };
      assert.equal(created.organizationId, owner.id);
      const edit = await call(vendor.id, `/products/${created.id}`, "PATCH", {
        name: "Updated from vendor",
        stock: 5,
      });
      assert.equal(edit.status, 200, await edit.clone().text());
      assert.equal(
        (
          await prisma.warehouseInventory.findFirstOrThrow({
            where: { productId: created.id },
          })
        ).quantity,
        5,
      );
      const operatorEdit = await call(
        operator.id,
        `/warehouses/${warehouse.id}/inventory/${created.id}`,
        "PATCH",
        { quantity: 9, name: "Updated from warehouse" },
      );
      assert.equal(operatorEdit.status, 200, await operatorEdit.clone().text());
      const current = await prisma.product.findUniqueOrThrow({
        where: { id: created.id },
      });
      assert.equal(current.stock, 9);
      assert.equal(current.name, "Updated from warehouse");
      assert.equal(
        (
          await call(outsider.id, `/products/${created.id}`, "PATCH", {
            stock: 0,
          })
        ).status,
        403,
      );
      assert.equal(
        (await call(vendor.id, `/warehouses/${warehouse.id}/products`)).status,
        403,
      );
      const operatorCatalog = await call(
        operator.id,
        `/warehouses/${warehouse.id}/products`,
      );
      assert.equal(operatorCatalog.status, 200);
      const warehouseProducts = (await operatorCatalog.json()) as Array<{
        id: string;
      }>;
      assert.ok(warehouseProducts.some((p) => p.id === created.id));
      assert.ok(!warehouseProducts.some((p) => p.id === recipientProduct.id));
      const vendorCatalog = await call(
        vendor.id,
        `/products?organizationId=${owner.id}&includeInactive=true`,
      );
      assert.equal(
        vendorCatalog.status,
        200,
        await vendorCatalog.clone().text(),
      );
      const vendorProducts = (await vendorCatalog.json()) as Array<{
        id: string;
      }>;
      assert.ok(vendorProducts.some((p) => p.id === created.id));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet([
          {
            name: "Imported shared product",
            sku: `${key}-operator`,
            price: 1500,
            stock: 11,
          },
        ]),
        "Products",
      );
      const buffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "buffer",
      }) as Buffer;
      const form = new FormData();
      form.append("organizationId", owner.id);
      form.append(
        "file",
        new Blob([new Uint8Array(buffer)], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "products.xlsx",
      );
      const imported = await fetch(`${base}/products/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token(vendor.id)}` },
        body: form,
      });
      assert.equal(imported.status, 200, await imported.clone().text());
      const importedResult = (await imported.json()) as {
        updated: number;
        errors: string[];
      };
      assert.equal(importedResult.updated, 1, JSON.stringify(importedResult));
      assert.equal(
        (
          await prisma.warehouseInventory.findFirstOrThrow({
            where: { productId: created.id },
          })
        ).quantity,
        11,
      );
      assert.equal(
        await prisma.product.count({
          where: { organizationId: owner.id, sku: `${key}-operator` },
        }),
        1,
      );

      const vendorCreate = await call(vendor.id, "/products", "POST", {
        organizationId: owner.id,
        name: `Vendor created ${key}`,
        price: 2500,
        stock: 3,
      });
      assert.equal(vendorCreate.status, 201, await vendorCreate.clone().text());
      const added = await prisma.product.findFirstOrThrow({
        where: { organizationId: owner.id, name: `Vendor created ${key}` },
      });
      assert.equal(added.managedByWarehouseId, warehouse.id);
      assert.equal(
        (
          await prisma.inventoryLedger.aggregate({
            where: { productId: added.id, warehouseId: warehouse.id },
            _sum: { change: true },
          })
        )._sum.change,
        3,
      );
      await prisma.$transaction(async (tx) => {
        const id = await resolveProductInventoryWarehouse(
          tx,
          owner.id,
          added.id,
        );
        assert.equal(id, warehouse.id);
        await adjustStock(tx, {
          productId: added.id,
          warehouseId: id ?? undefined,
          change: -1,
          reason: "ORDER",
        });
      });
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: added.id } }))
          .stock,
        2,
      );
      assert.equal(
        (
          await prisma.warehouseInventory.findFirstOrThrow({
            where: { productId: added.id },
          })
        ).quantity,
        2,
      );
      assert.deepEqual(
        (
          await prisma.warehouse.findMany({
            where: stocktakeWarehouseFilter(owner.id),
            select: { id: true },
          })
        ).map((w) => w.id),
        [warehouse.id],
      );
      await assert.rejects(
        prisma.$transaction((tx) =>
          assertStocktakeScope(tx, owner.id, legacyWarehouse.id),
        ),
        /Нэгдсэн/,
      );
      await assert.rejects(
        prisma.$transaction((tx) => assertStocktakeScope(tx, owner.id, null)),
        /Нэгдсэн/,
      );
      await assert.rejects(
        prisma.$transaction((tx) =>
          assertStocktakeScope(tx, recipient.id, warehouse.id),
        ),
        /эрхгүй/,
      );
      const sharedCount = await createStocktake({
        id: randomUUID(),
        organizationId: owner.id,
        warehouseId: warehouse.id,
        title: "Shared inventory count",
        kind: "FULL",
        actorId: vendor.id,
      });
      assert.ok(
        sharedCount.lines.some(
          (line) => line.productId === added.id && line.expected === 2,
        ),
      );
      await prisma.stocktake.delete({ where: { id: sharedCount.id } });
      const unrelatedWarehouse = await prisma.$transaction((tx) =>
        resolveProductInventoryWarehouse(tx, recipient.id, recipientProduct.id),
      );
      assert.notEqual(unrelatedWarehouse, warehouse.id);
      assert.equal(
        (
          await prisma.warehouse.findUniqueOrThrow({
            where: { id: unrelatedWarehouse ?? "" },
          })
        ).type,
        "VENDOR_INTERNAL",
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      const productWhere = { organizationId: { in: [owner.id, recipient.id] } };
      await prisma.inventoryLedger.deleteMany({
        where: { product: productWhere },
      });
      await prisma.product.deleteMany({ where: productWhere });
      await prisma.warehouse.deleteMany({
        where: {
          OR: [
            { id: warehouse.id },
            {
              organizations: {
                some: { organizationId: { in: [owner.id, recipient.id] } },
              },
            },
          ],
        },
      });
      await prisma.organizationMember.deleteMany({
        where: { organizationId: { in: [owner.id, recipient.id] } },
      });
      await prisma.organization.deleteMany({
        where: { id: { in: [owner.id, recipient.id] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [vendor.id, operator.id, outsider.id] } },
      });
    }
  },
);
