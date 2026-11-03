import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildQuickProductPatch,
  formatManagedStock,
  productCurrency,
} from "./managed-product-display";
import type { ManagedProduct } from "./managed-product.types";
const product: ManagedProduct = {
  id: "p1",
  name: "Бараа",
  price: 1200,
  stock: 6,
  unit: "pcs",
};

test("price-only updates do not overwrite stock or other product fields", () => {
  assert.deepEqual(buildQuickProductPatch(product, "1400", "6"), {
    price: 1400,
  });
  assert.deepEqual(buildQuickProductPatch(product, "1200", "4"), { stock: 4 });
  assert.deepEqual(buildQuickProductPatch(product, "1200", "6"), {});
});
test("preorder uses its original currency amount and never sends physical stock", () => {
  const preorder: ManagedProduct = {
    ...product,
    supplyType: "CHINA_PREORDER",
    preorderPriceAmount: 100,
    preorderPriceCurrency: "USD",
  };
  assert.deepEqual(buildQuickProductPatch(preorder, "150", "999"), {
    preorderPriceAmount: 150,
  });
  assert.equal(productCurrency(preorder), "USD");
  assert.equal(formatManagedStock(preorder), "Захиалгаар");
});
test("weight stock keeps display kilograms and validates gram precision", () => {
  const weighted = { ...product, unit: "kg", stock: 1.25 };
  assert.deepEqual(buildQuickProductPatch(weighted, "1200", "2.125"), {
    stock: 2.125,
  });
  assert.equal(formatManagedStock(weighted), "1.25 кг");
  assert.throws(() => buildQuickProductPatch(weighted, "1200", "2.1234"));
});
test("invalid prices and quantities are rejected; zero remains valid", () => {
  for (const price of ["", " ", "-1", "NaN", "Infinity"])
    assert.throws(() => buildQuickProductPatch(product, price, "6"));
  for (const stock of ["", "-1", "1.1", "Infinity", "2147483648"])
    assert.throws(() => buildQuickProductPatch(product, "1200", stock));
  assert.deepEqual(buildQuickProductPatch(product, "0", "0"), {
    price: 0,
    stock: 0,
  });
});
