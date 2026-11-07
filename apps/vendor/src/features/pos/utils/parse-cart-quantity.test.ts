import assert from "node:assert/strict";
import test from "node:test";
import { parseCartQuantity } from "./parse-cart-quantity";

test("weighted cart input accepts gram precision below one kilogram", () => {
  for (const [input, expected] of [
    ["0.25", 0.25],
    ["0,125", 0.125],
    [".5", 0.5],
    ["0.001", 0.001],
    ["2.225", 2.225],
  ] as const) {
    assert.equal(parseCartQuantity(input, "kg"), expected);
  }
});

test("clearing or partially typing cannot turn the sale quantity into zero or NaN", () => {
  for (const input of ["", " ", "0", "0.", ".", "-1", "abc", "1e3", "0.0001", "1.2345"]) {
    assert.equal(parseCartQuantity(input, "kg"), null, input);
  }
});

test("piece quantities remain positive whole numbers", () => {
  assert.equal(parseCartQuantity("12", "pcs"), 12);
  for (const input of ["", "0", "0.25", "1.5", "1,5", "-1"]) {
    assert.equal(parseCartQuantity(input, "pcs"), null, input);
  }
});
