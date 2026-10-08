import assert from "node:assert/strict";
import test from "node:test";
import { stocktakeProductFilter } from "./stocktake.service";

test("stocktakes include only active physical inventory products", () => {
  assert.deepEqual(stocktakeProductFilter("organization-1"), {
    organizationId: "organization-1",
    deletedAt: null,
    isActive: true,
    isRestaurantMenuItem: false,
    supplyType: "IN_STOCK",
  });
});
