import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateRestaurantSelectedUnitDiscount as discount,
  isRestaurantLineDiscountPercent as valid,
} from "../src/domain/restaurant-line-discount";

test("new and existing ticket rows have no automatic discount", () => {
  assert.equal(discount({ unitPrice: 10000 }), 0);
  assert.equal(discount({ unitPrice: 10000, discountPercent: 0 }), 0);
});
test("each explicit rate produces the exact selected discount", () => {
  for (const percent of [10, 20, 30, 40])
    assert.equal(
      discount({ unitPrice: 10000, discountPercent: percent }),
      percent * 100,
    );
});
test("turning the discount off restores the original price", () => {
  assert.equal(discount({ unitPrice: 10000, discountPercent: 40 }), 4000);
  assert.equal(discount({ unitPrice: 10000, discountPercent: 0 }), 0);
});
test("API accepts only numeric allowed rates", () => {
  for (const value of [0, 10, 20, 30, 40]) assert.equal(valid(value), true);
  for (const value of ["20", 15, -10, 50, 100, NaN, null, true])
    assert.equal(valid(value), false);
});
test("rounding and invalid prices cannot produce negative or excessive discounts", () => {
  assert.equal(discount({ unitPrice: 123.45, discountPercent: 20 }), 24.69);
  assert.equal(discount({ unitPrice: NaN, discountPercent: 20 }), 0);
  assert.equal(discount({ unitPrice: 10000, discountPercent: 100 }), 0);
});
