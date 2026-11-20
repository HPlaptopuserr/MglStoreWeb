import assert from "node:assert/strict";
import { test } from "node:test";
import type { CartLine } from "../types/pos.types";
import { calculateCartTotal } from "./calculate-cart-total";

const line: CartLine = { productId: "first", name: "Weighted item", unitPrice: 1.5, baseUnitPrice: 1.5, priceType: "UNIT", qty: 0.01, stockQty: 10, taxType: "VAT_ABLE", taxRate: 10, measureUnit: "kg", discountAmount: 0 };
test("checkout sums the exact cent amounts persisted and sent as fiscal lines", () => {
  assert.deepEqual(calculateCartTotal([line, { ...line, productId: "second" }]), { subTotal: 0.04, discountTotal: 0, grandTotal: 0.04, taxTotal: 0 });
  assert.deepEqual(calculateCartTotal([{ ...line, discountAmount: 0.5 }, { ...line, productId: "second", discountAmount: 0.5 }]), { subTotal: 0.04, discountTotal: 0.02, grandTotal: 0.02, taxTotal: 0 });
});
test("checkout applies discounts per unit as required by the payment and sale contract", () => {
  assert.deepEqual(calculateCartTotal([{ ...line, unitPrice: 100, qty: 3, discountAmount: 10 }]), { subTotal: 300, discountTotal: 30, grandTotal: 270, taxTotal: 24.55 });
});
