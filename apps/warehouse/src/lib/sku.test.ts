import assert from "node:assert/strict";
import test from "node:test";
import { nextNum, skuPrefix } from "./sku";
test("automatic SKU uses compact product and organization abbreviations", () => {
  assert.equal(skuPrefix("test2", "Амина"), "TST-AMN");
  for (const name of ["Лууван Ховд", "Pepsi 0.33l", "Гурил 50кг 1р гурил", "!!!", "A"]) {
    assert.match(`${skuPrefix(name, "Амина")}-001`, /^[A-Z0-9]{3}-[A-Z0-9]{3}-001$/);
  }
});
test("SKU sequence advances existing codes", () => {
  assert.equal(nextNum([]), "001");
  assert.equal(nextNum([{ sku: "TST-AMN-001" }, { sku: "TST-AMN-009" }]), "010");
  assert.equal(nextNum([{ sku: null }]), "001");
});
