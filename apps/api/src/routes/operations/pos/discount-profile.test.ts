import assert from "node:assert/strict";
import test from "node:test";
import { resolvePosDiscountProfileType } from "./discount-profile";

test("maps enabled cafe mode to regular customer profiles", () => {
  assert.equal(
    resolvePosDiscountProfileType("true", "CAFE"),
    "REGULAR_CUSTOMER",
  );
});

test("maps enabled restaurant or missing mode to employee profiles", () => {
  assert.equal(resolvePosDiscountProfileType("1", "RESTAURANT"), "EMPLOYEE");
  assert.equal(resolvePosDiscountProfileType("yes", undefined), "EMPLOYEE");
});

test("disables discount profiles when self service is disabled", () => {
  assert.equal(resolvePosDiscountProfileType("false", "CAFE"), null);
  assert.equal(resolvePosDiscountProfileType(undefined, "RESTAURANT"), null);
});
