import assert from "node:assert/strict";
import test from "node:test";
import {
  missingStocktakeLines,
  stocktakeProductFilter,
} from "./stocktake.service";

test("stocktakes include only active physical inventory products", () => {
  assert.deepEqual(stocktakeProductFilter("organization-1"), {
    organizationId: "organization-1",
    deletedAt: null,
    isActive: true,
    isRestaurantMenuItem: false,
    supplyType: "IN_STOCK",
  });
});

test("full conversion adds only missing products and preserves existing lines", () => {
  const existing = [{ productId: "already-counted", counted: 7 }];
  const current = [
    { productId: "already-counted", expected: 7 },
    { productId: "missing-product", expected: 3 },
  ];

  assert.deepEqual(missingStocktakeLines(current, existing), [current[1]]);
  assert.equal(existing[0].counted, 7);
});
