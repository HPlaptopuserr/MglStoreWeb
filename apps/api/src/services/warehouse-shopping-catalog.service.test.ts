import assert from "node:assert/strict";
import test from "node:test";
import { prisma, type Prisma } from "@mgl/database";
import {
  buildShoppingCategories,
  readWarehouseShoppingCatalog,
  shoppingCategoryProductWhere,
  shoppingSearchProductWhere,
} from "./warehouse-shopping-catalog.service";

const categories = [
  { id: "food", name: "Хүнс", parentId: null },
  { id: "dairy", name: "Сүү, цагаан идээ", parentId: "food" },
  { id: "milk", name: "Сүү", parentId: "dairy" },
  { id: "home", name: "Гэр ахуй", parentId: null },
];

test("shopping categories include every stocked product's ancestors and prefer product categories over legacy labels", () => {
  const result = buildShoppingCategories(
    [
      {
        businessCategoryId: "milk",
        category: { id: "retail", name: "Худалдаа" },
      },
      { businessCategoryId: "dairy", category: null },
      { businessCategoryId: null, category: { id: "food", name: "Хүнс" } },
      { businessCategoryId: null, category: null },
    ],
    categories,
  );
  assert.equal(
    result.find((category) => category.id === "business:food")?.productCount,
    2,
  );
  assert.equal(
    result.find((category) => category.id === "business:dairy")?.productCount,
    2,
  );
  assert.equal(
    result.find((category) => category.id === "business:milk")?.parentId,
    "business:dairy",
  );
  assert.equal(
    result.find((category) => category.id === "legacy:food")?.productCount,
    1,
  );
  assert.equal(
    result.find((category) => category.id === "uncategorized")?.productCount,
    1,
  );
  assert.ok(
    !result.some(
      (category) =>
        category.id === "business:home" || category.id === "legacy:retail",
    ),
  );
});

test("a main category includes its children and grandchildren without including other departments", () => {
  assert.deepEqual(shoppingCategoryProductWhere("business:food", categories), {
    businessCategoryId: { in: ["food", "dairy", "milk"] },
  });
  assert.deepEqual(shoppingCategoryProductWhere("invalid", categories), {
    businessCategoryId: { in: [] },
  });
});

test("category traversal terminates if existing data contains a cycle", () => {
  const cyclic = [
    { id: "a", name: "A", parentId: "b" },
    { id: "b", name: "B", parentId: "a" },
  ];
  assert.equal(
    buildShoppingCategories(
      [{ businessCategoryId: "a", category: null }],
      cyclic,
    ).length,
    2,
  );
  assert.deepEqual(shoppingCategoryProductWhere("business:a", cyclic), {
    businessCategoryId: { in: ["a", "b"] },
  });
});

test("shopping search requires each word and includes alternate barcodes without a six-word cutoff", () => {
  const where = shoppingSearchProductWhere("  MGL  Цэвэр ус 5 л x 4  ");
  assert.ok(Array.isArray(where.AND));
  assert.equal(where.AND.length, 7);
  assert.deepEqual(where.AND[0], {
    OR: [
      { name: { contains: "MGL", mode: "insensitive" } },
      { sku: { contains: "MGL", mode: "insensitive" } },
      { barcode: { contains: "MGL", mode: "insensitive" } },
      { barcodeAliases: { has: "MGL" } },
    ],
  });
  assert.deepEqual(shoppingSearchProductWhere("8650000123456").AND, [
    {
      OR: [
        { name: { contains: "8650000123456", mode: "insensitive" } },
        { sku: { contains: "8650000123456", mode: "insensitive" } },
        { barcode: { contains: "8650000123456", mode: "insensitive" } },
        { barcodeAliases: { has: "8650000123456" } },
      ],
    },
  ]);
});

test("search pages keep warehouse-wide categories, paginate in the database and subtract reservations", async (t) => {
  const originalFindCategories = prisma.businessCategory.findMany;
  const originalFindInventory = prisma.warehouseInventory.findMany;
  const originalCount = prisma.warehouseInventory.count;
  t.after(() => {
    Object.assign(prisma.businessCategory, {
      findMany: originalFindCategories,
    });
    Object.assign(prisma.warehouseInventory, {
      findMany: originalFindInventory,
      count: originalCount,
    });
  });
  Object.assign(prisma.businessCategory, { findMany: async () => categories });
  const queries: Prisma.WarehouseInventoryFindManyArgs[] = [];
  Object.assign(prisma.warehouseInventory, {
    findMany: async (args: Prisma.WarehouseInventoryFindManyArgs) => {
      queries.push(args);
      if (args.take === undefined)
        return [
          { product: { businessCategoryId: "milk", category: null } },
          { product: { businessCategoryId: "home", category: null } },
        ];
      return [
        {
          id: "inv",
          productId: "milk-product",
          quantity: 10,
          minQuantity: 1,
          location: null,
          product: { id: "milk-product", name: "Сүү", price: 3000 },
        },
      ];
    },
    count: async () => 81,
  });
  const result = await readWarehouseShoppingCatalog(
    {
      warehouseId: "central",
      search: "Сүү",
      categoryId: "business:food",
      page: 2,
      limit: 40,
    },
    {
      db: prisma,
      reservedStock: async (warehouseId, ids) => {
        assert.equal(warehouseId, "central");
        assert.deepEqual(ids, ["milk-product"]);
        return new Map([["milk-product", 3]]);
      },
    },
  );
  assert.equal(queries.length, 2);
  assert.deepEqual(queries[0].where, {
    warehouseId: "central",
    quantity: { gt: 0 },
    product: { deletedAt: null, isActive: true },
  });
  assert.equal(queries[1].skip, 40);
  assert.equal(queries[1].take, 40);
  assert.deepEqual(queries[1].where?.product, {
    AND: [
      { deletedAt: null, isActive: true },
      shoppingSearchProductWhere("Сүү"),
      { businessCategoryId: { in: ["food", "dairy", "milk"] } },
    ],
  });
  assert.equal(result.items[0].quantity, 7);
  assert.equal(result.total, 81);
  assert.equal(result.hasMore, true);
  assert.ok(
    result.categories.some((category) => category.id === "business:home"),
  );
});
