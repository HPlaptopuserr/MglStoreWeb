import assert from "node:assert/strict";
import test from "node:test";
import { canViewStockOrderOwnership } from "./stock-order-visibility.policy";

test("order ownership is limited to manager and higher roles", () => {
  assert.equal(canViewStockOrderOwnership("USER", "OWNER"), true);
  assert.equal(canViewStockOrderOwnership("USER", "ADMIN"), true);
  assert.equal(canViewStockOrderOwnership("USER", "STAFF"), false);
  assert.equal(canViewStockOrderOwnership("USER", "VIEWER"), false);
});
