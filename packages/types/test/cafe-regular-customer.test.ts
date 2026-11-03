import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCafeRegularCustomerDiscount,
  calculateCafeRegularCustomerUnitDiscount,
  normalizeCafeRegularCustomerDiscount,
  normalizeCafeRegularCustomerPhone,
} from "../src/domain/cafe-regular-customer";

test("regular customer phone accepts local and +976 formats", () => {
  assert.equal(normalizeCafeRegularCustomerPhone("9911-2233"), "99112233");
  assert.equal(normalizeCafeRegularCustomerPhone("+976 9911 2233"), "99112233");
  assert.equal(normalizeCafeRegularCustomerPhone("123"), null);
});

test("regular customer discount is constrained to two decimals", () => {
  assert.equal(normalizeCafeRegularCustomerDiscount(12.5), 12.5);
  assert.equal(normalizeCafeRegularCustomerDiscount(""), null);
  assert.equal(normalizeCafeRegularCustomerDiscount(100), 100);
  assert.equal(normalizeCafeRegularCustomerDiscount(100.01), null);
  assert.equal(normalizeCafeRegularCustomerDiscount(1.234), null);
});

test("regular customer discount uses deterministic line rounding", () => {
  assert.equal(calculateCafeRegularCustomerUnitDiscount(2_500, 10), 250);
  assert.equal(
    calculateCafeRegularCustomerDiscount(
      [
        { unitPrice: 2_500, quantity: 2 },
        { unitPrice: 4_000, quantity: 1 },
      ],
      10,
    ),
    900,
  );
});
