import assert from "node:assert/strict";
import test from "node:test";
import { prisma, Prisma } from "@mgl/database";
import {
  mapSalesProducts,
  readWarehouseCatalogSales,
  type CatalogSalesProduct,
} from "./warehouse-catalog-sales.service";

function product(
  id: string,
  patch: Partial<CatalogSalesProduct> = {},
): CatalogSalesProduct {
  return {
    id,
    name: id,
    masterProductId: null,
    barcode: null,
    barcodeAliases: [],
    sku: null,
    unit: "pcs",
    ...patch,
  };
}

test("store copies match by master product or barcode without counting unrelated products with the same name", () => {
  const warehouse = [
    product("milk", { masterProductId: "milk-master", barcode: "865001" }),
    product("tea", { name: "Цай", sku: "TEA" }),
  ];
  const targets = mapSalesProducts(warehouse, [
    product("shop-milk", { masterProductId: "milk-master", barcode: "865001" }),
    product("old-milk", { barcodeAliases: ["865001"] }),
    product("conflict", { masterProductId: "other-master", barcode: "865001" }),
    product("same-name", { name: "Цай" }),
    product("shop-tea", { name: "цай", sku: "tea" }),
    product("sku-collision", { name: "Будаа", sku: "TEA" }),
  ]);
  assert.deepEqual(targets.get("shop-milk"), ["milk"]);
  assert.deepEqual(targets.get("old-milk"), ["milk"]);
  assert.deepEqual(targets.get("conflict"), []);
  assert.deepEqual(targets.get("same-name"), []);
  assert.deepEqual(targets.get("shop-tea"), ["tea"]);
  assert.deepEqual(targets.get("sku-collision"), []);
});

test("completed online and POS sales combine once per product over 90 days; transfers and requests are not used", async (t) => {
  const originalProduct = prisma.product.findMany;
  const originalOnline = prisma.orderItem.groupBy;
  const originalPos = prisma.posSaleLine.groupBy;
  t.after(() => {
    Object.assign(prisma.product, { findMany: originalProduct });
    Object.assign(prisma.orderItem, { groupBy: originalOnline });
    Object.assign(prisma.posSaleLine, { groupBy: originalPos });
  });
  const warehouse = [
    product("milk", { barcode: "865001" }),
    product("rice", { masterProductId: "rice-master", unit: "kg" }),
  ];
  Object.assign(prisma.product, {
    findMany: async () => [
      product("shop-milk", { barcode: "865001" }),
      product("shop-rice", { masterProductId: "rice-master", unit: "kg" }),
      product("unrelated"),
    ],
  });
  const now = new Date("2026-11-14T00:00:00Z");
  const since = new Date(now.getTime() - 90 * 86400000);
  Object.assign(prisma.orderItem, {
    groupBy: async (args: Prisma.OrderItemGroupByArgs) => {
      assert.deepEqual(args.where, {
        productId: { in: ["shop-milk", "shop-rice"] },
        order: {
          status: "COMPLETED",
          deletedAt: null,
          createdAt: { gte: since },
        },
      });
      return [{ productId: "shop-milk", _sum: { quantity: 3 } }];
    },
  });
  Object.assign(prisma.posSaleLine, {
    groupBy: async (args: Prisma.PosSaleLineGroupByArgs) => {
      assert.deepEqual(args.where, {
        productId: { in: ["shop-milk", "shop-rice"] },
        sale: { status: "COMPLETED", createdAt: { gte: since } },
      });
      return [
        { productId: "shop-milk", _sum: { qty: new Prisma.Decimal(7) } },
        { productId: "shop-rice", _sum: { qty: new Prisma.Decimal(500) } },
      ];
    },
  });
  const totals = await readWarehouseCatalogSales(warehouse, prisma, now);
  assert.equal(totals.get("milk"), 10);
  assert.equal(totals.get("rice"), 0.5);
  assert.equal(totals.size, 2);
});

test("an empty catalog does not query sales", async () => {
  assert.deepEqual(await readWarehouseCatalogSales([]), new Map());
});
