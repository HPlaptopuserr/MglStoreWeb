import assert from "node:assert/strict";
import test from "node:test";
import { readPosFiscalTaxTotals } from "../src/domain/pos-fiscal-tax";

test("actual fiscal zero VAT survives direct and stored response payloads", () => {
  assert.deepEqual(
    readPosFiscalTaxTotals({ totalVAT: 0, totalCityTax: "0.00" }),
    { totalVAT: 0, totalCityTax: 0 },
  );
  assert.deepEqual(
    readPosFiscalTaxTotals({
      response: { totalVAT: "90.91", totalCityTax: 2 },
    }),
    { totalVAT: 90.91, totalCityTax: 2 },
  );
  assert.deepEqual(readPosFiscalTaxTotals({ response: { id: "old" } }), {});
});
test("unknown or malformed fiscal tax values never replace a historical tax estimate", () => {
  for (const totalVAT of [null, "", -1, NaN, Infinity, {}, "1,000", 1.234])
    assert.deepEqual(readPosFiscalTaxTotals({ totalVAT }), {});
});
