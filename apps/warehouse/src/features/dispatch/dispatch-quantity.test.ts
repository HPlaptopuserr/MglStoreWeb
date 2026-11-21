import assert from "node:assert/strict";
import test from "node:test";
import { commitDispatchQuantity } from "./DispatchQuantityInput";

test("clearing a dispatch quantity keeps the previous value until a valid integer is committed", () => {
  assert.equal(commitDispatchQuantity("", 5), 5);
  assert.equal(commitDispatchQuantity("12", 5), 12);
  assert.equal(commitDispatchQuantity("0012", 5), 12);
});

test("dispatch quantities reject partial, fractional, negative and unsafe values", () => {
  for (const text of [" ", "0", "-1", "1.5", "1e2", "12oops", "9007199254740992"])
    assert.equal(commitDispatchQuantity(text, 5), 5, text);
});
