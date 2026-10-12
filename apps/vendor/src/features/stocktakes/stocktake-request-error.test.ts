import test from "node:test";
import assert from "node:assert/strict";
import { StocktakeRequestError } from "./stocktake-request-error";

test("stock conflicts preserve exact row ids, including empty membership conflicts", () => {
  const error = new StocktakeRequestError({ message: "Changed", code: "STOCKTAKE_STOCK_CHANGED", changedLineIds: ["line-5"] });
  assert.equal(error.message, "Changed");
  assert.deepEqual(error.changedLineIds, ["line-5"]);
  assert.deepEqual(new StocktakeRequestError({ code: "STOCKTAKE_STOCK_CHANGED", changedLineIds: [] }).changedLineIds, []);
});

test("generic, legacy and malformed errors never flag unrelated rows", () => {
  for (const payload of [null, "error", { message: "Legacy" }, { changedLineIds: ["x"] }, { code: "STOCKTAKE_STOCK_CHANGED", changedLineIds: [1] }]) {
    assert.equal(new StocktakeRequestError(payload).changedLineIds, null);
  }
});
