import assert from "node:assert/strict";
import test from "node:test";
import { parseCardCheckout, sameCheckout } from "./pos-card-checkout";

const checkout = {
  clientSaleId: "sale",
  branchId: "branch",
  shiftId: "shift",
  lines: [
    { productId: "product", qty: 1, unitPrice: 50_000_000, discountAmount: 0 },
  ],
};
test("a payment basket rejects malformed quantities, prices, discounts and duplicate products", () => {
  for (const patch of [
    { qty: 0 },
    { qty: 1.00001 },
    { unitPrice: -1 },
    { unitPrice: Number.NaN },
    { discountAmount: -1 },
    { discountAmount: 50_000_001 },
    { priceType: "OTHER" },
  ]) {
    assert.throws(() =>
      parseCardCheckout({
        ...checkout,
        lines: [{ ...checkout.lines[0], ...patch }],
      }),
    );
  }
  assert.throws(() =>
    parseCardCheckout({
      ...checkout,
      lines: [checkout.lines[0], checkout.lines[0]],
    }),
  );
  assert.throws(() => parseCardCheckout({ ...checkout, shiftId: "" }));
  assert.equal(parseCardCheckout(checkout).lines[0].unitPrice, 50_000_000);
});
test("the frozen basket binds sale identity, shift, prices, quantities and discounts", () => {
  const frozen = parseCardCheckout(checkout);
  assert.equal(sameCheckout(frozen, checkout), true);
  assert.equal(sameCheckout(frozen, { ...checkout, shiftId: "other" }), false);
  assert.equal(
    sameCheckout(frozen, { ...checkout, clientSaleId: "other" }),
    false,
  );
  assert.equal(
    sameCheckout(frozen, {
      ...checkout,
      lines: [{ ...checkout.lines[0], qty: 2, unitPrice: 25_000_000 }],
    }),
    false,
  );
});
