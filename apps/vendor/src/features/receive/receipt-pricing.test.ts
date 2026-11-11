import assert from "node:assert/strict";
import test from "node:test";
import { markedUpPrice, receiptSalePrice } from "./receipt-pricing";

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

test("barcode receipt uses the registered sale price without a markup", () => {
  const product = { id: "milk", name: "Сүү", stock: 0, price: 4500 };
  assert.equal(receiptSalePrice(product, "3000", ""), "4500");
  assert.equal(receiptSalePrice(product, "3500", ""), "4500");
  assert.equal(receiptSalePrice(product, "", ""), "4500");
  assert.equal(receiptSalePrice({ ...product, price: 0 }, "3000", ""), "0");
  assert.equal(
    receiptSalePrice({ ...product, price: 4500.25 }, "3000", ""),
    "4500.25",
  );
});

test("receipt markup calculates a sale price and removing it restores the registered price", () => {
  const product = { id: "milk", name: "Сүү", stock: 0, price: 4500 };
  assert.equal(receiptSalePrice(product, "3000", "20"), "3600");
  assert.equal(receiptSalePrice(product, "3500", "20"), "4200");
  assert.equal(receiptSalePrice(product, "3500", ""), "4500");
  assert.equal(
    receiptSalePrice({ ...product, price: undefined }, "3000", "20"),
    "3600",
  );
  assert.equal(
    receiptSalePrice({ ...product, price: undefined }, "3000", ""),
    "",
  );
});
