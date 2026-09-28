import assert from "node:assert/strict";
import test from "node:test";
import { markedUpPrice } from "./receipt-pricing";

test("marks up purchase cost, preserving zero and fractional amounts", () => {
  assert.equal(markedUpPrice("10000", "20"), "12000");
  assert.equal(markedUpPrice("10000", "30"), "13000");
  assert.equal(markedUpPrice("10000", "40"), "14000");
  assert.equal(markedUpPrice("123.45", "12.5"), "138.88");
  assert.equal(markedUpPrice("0", "20"), "0");
  for (const [cost, rate] of [
    ["", "20"],
    ["100", ""],
    ["-1", "20"],
    ["100", "-20"],
    ["NaN", "20"],
  ]) {
    assert.equal(markedUpPrice(cost, rate), "");
  }
});
