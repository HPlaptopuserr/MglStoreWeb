import assert from "node:assert/strict";
import test from "node:test";
import { readWarehouseProductsPage } from "./warehouse-products-page";

test("category metadata is independent of the current search page", () => {
  const categories = [
    { id: "business:food", name: "Хүнс", parentId: null, productCount: 100 },
  ];
  assert.deepEqual(
    readWarehouseProductsPage(
      { items: [], total: 0, hasMore: false, categories },
      1,
      40,
    ),
    {
      items: [],
      total: 0,
      hasMore: false,
      categories,
    },
  );
});

test("malformed category metadata is excluded and old page responses remain readable", () => {
  assert.deepEqual(
    readWarehouseProductsPage(
      { categories: [null, {}, { id: "bad", name: "Bad" }] },
      1,
      40,
    ).categories,
    [],
  );
  assert.deepEqual(readWarehouseProductsPage([], 1, 40), {
    items: [],
    total: 0,
    hasMore: false,
  });
  assert.equal(
    readWarehouseProductsPage({ items: [], total: 100 }, 1, 40).hasMore,
    true,
  );
});
