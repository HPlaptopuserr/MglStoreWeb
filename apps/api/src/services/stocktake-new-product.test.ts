import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { parseStocktakeNewProduct } from "./stocktake-new-product.service";
const valid = { id: randomUUID(), name: "Бараа", barcode: "", unit: "pcs", quantity: 1, unitCost: 100, salePrice: 200, registerId: "register" };
test("new stocktake products validate quantities, units, identifiers and prices", () => {
  assert.equal(parseStocktakeNewProduct({ ...valid, unit: "kg", quantity: 1.025 }).quantity, 1.025);
  for (const patch of [{ quantity: 0 }, { quantity: 1.2 }, { unit: "kg", quantity: 0.0001 }, { unit: "bad" }, { unitCost: -1 }, { salePrice: Infinity }, { quantity: "1" }, { id: "bad" }, { name: "" }, { registerId: "" }]) {
    assert.throws(() => parseStocktakeNewProduct({ ...valid, ...patch }));
  }
});
