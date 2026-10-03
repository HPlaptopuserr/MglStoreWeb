import assert from "node:assert/strict";
import test from "node:test";
import {
  displayWeight,
  weightInKilograms,
  displayWeightPrice,
  pricePerKilogram,
} from "./receipt-weight";

test("500 grams at 20000 per kg totals 10000", () => {
  assert.equal(
    weightInKilograms(500, "g") * pricePerKilogram(20000, "kg"),
    10000,
  );
});
test("gram pricing and kg pricing preserve the same cost", () => {
  assert.equal(pricePerKilogram(20, "g"), 20000);
  assert.equal(displayWeightPrice(20000, "g"), 20);
  assert.equal(displayWeight(0.5, "g"), 500);
});
test("unit switches preserve fractional prices and one gram precision", () => {
  assert.equal(
    pricePerKilogram(displayWeightPrice(1234.56, "g"), "g"),
    1234.56,
  );
  assert.equal(weightInKilograms(displayWeight(0.001, "g"), "g"), 0.001);
  assert.equal(pricePerKilogram(0, "g"), 0);
});
