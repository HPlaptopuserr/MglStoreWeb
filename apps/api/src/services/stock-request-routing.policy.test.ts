import assert from "node:assert/strict";
import test from "node:test";
import {
  canAdminAdvanceStockRequest,
  effectiveWarehouseDispatchStatus,
} from "./stock-request-routing.policy";

test("admin cannot bypass a warehouse dispatch workflow", () => {
  assert.equal(canAdminAdvanceStockRequest({ id: "dispatch-1" }), false);
});

test("legacy requests without a dispatch can still be advanced by admin", () => {
  assert.equal(canAdminAdvanceStockRequest(null), true);
  assert.equal(canAdminAdvanceStockRequest(undefined), true);
});

test("completed legacy requests appear delivered instead of re-entering warehouse work", () => {
  assert.equal(
    effectiveWarehouseDispatchStatus("PENDING", "COMPLETED"),
    "DELIVERED",
  );
  assert.equal(
    effectiveWarehouseDispatchStatus("CONFIRMED", "PROCESSING"),
    "CONFIRMED",
  );
});
