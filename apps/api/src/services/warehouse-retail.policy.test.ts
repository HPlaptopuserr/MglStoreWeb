import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRetailCheckout } from "./warehouse-retail.policy";
const input = {
  checkoutKey: "checkout-test-key-123",
  phone: "+976 9911-2233",
  shippingAddress: "Улаанбаатар, Баянгол, 1-р хороо",
  lines: [{ productId: "product", quantity: 2 }],
};
test("retail checkout normalizes phone and ignores submitted prices and warehouse identities", () => {
  const parsed = parseRetailCheckout({
    ...input,
    total: 1,
    warehouseId: "foreign",
    lines: [{ ...input.lines[0], price: 1 }],
  });
  assert.equal(parsed.phone, "99112233");
  assert.deepEqual(parsed.lines, [{ productId: "product", quantity: 2 }]);
  assert.equal("total" in parsed, false);
});
test("retail checkout rejects duplicate lines and invalid quantities", () => {
  assert.throws(() =>
    parseRetailCheckout({ ...input, lines: [input.lines[0], input.lines[0]] }),
  );
  for (const quantity of [0, -1, 1.5, NaN, Infinity, "1", 10001])
    assert.throws(() =>
      parseRetailCheckout({
        ...input,
        lines: [{ productId: "product", quantity }],
      }),
    );
});
test("retail checkout requires valid phone, address, idempotency key and nonempty basket", () => {
  for (const data of [
    null,
    {},
    { ...input, phone: "12" },
    { ...input, shippingAddress: "" },
    { ...input, checkoutKey: "short" },
    { ...input, lines: [] },
  ])
    assert.throws(() => parseRetailCheckout(data));
});
