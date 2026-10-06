import test from "node:test";
import assert from "node:assert/strict";
import { initialPosState, posReducer } from "./pos.store";
import type { CartLine } from "../types/pos.types";

test("restocked product increases an existing cart line using its refreshed stock", () => {
  const line = { productId: "p", name: "Test", qty: 1, stockQty: 1, unitPrice: 100,
    taxRate: 0, discountAmount: 0, measureUnit: "pcs" } as CartLine;
  const initial = posReducer(initialPosState, { type: "add-line", payload: line });
  const next = posReducer(initial, { type: "add-line", payload: { ...line, stockQty: 5 } });
  assert.equal(next.cart[0]?.qty, 2);
  assert.equal(next.cart[0]?.stockQty, 5);
  assert.equal(next.lastError, null);
});
