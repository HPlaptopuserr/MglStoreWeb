import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import {
  assertTransferCounts,
  parseTransfer,
  parseTransferAcceptance,
} from "./warehouse-transfer.policy";
const draft = () => ({
  id: randomUUID(),
  sourceWarehouseId: "a",
  destinationWarehouseId: "b",
  items: [{ productId: "p", quantity: 2 }],
});
test("rejects invalid, duplicate and same-warehouse shipments", () => {
  for (const quantity of [0, -1, 1.2, NaN, Infinity, "2", 2147483648])
    assert.throws(() =>
      parseTransfer({ ...draft(), items: [{ productId: "p", quantity }] }),
    );
  assert.throws(() =>
    parseTransfer({ ...draft(), destinationWarehouseId: "a" }),
  );
  assert.throws(() =>
    parseTransfer({
      ...draft(),
      items: [
        { productId: "p", quantity: 1 },
        { productId: "p", quantity: 1 },
      ],
    }),
  );
  assert.equal(parseTransfer(draft()).items[0].quantity, 2);
});
test("receipt requires every row, exact quantities and valid selling prices", () => {
  const rows = [{ id: "row", quantity: 2 }];
  assert.throws(() => assertTransferCounts(rows, []));
  assert.throws(() => assertTransferCounts(rows, [{ id: "row", quantity: 1 }]));
  assert.throws(() =>
    assertTransferCounts(rows, [{ id: "other", quantity: 2 }]),
  );
  for (const salePrice of [-1, NaN, Infinity, "", 1.234])
    assert.throws(() =>
      parseTransferAcceptance({
        items: [{ id: "row", quantity: 2, salePrice }],
      }),
    );
  const accepted = parseTransferAcceptance({
    items: [
      { id: "row", quantity: 2, salePrice: 12.34, targetProductId: null },
    ],
  });
  assert.doesNotThrow(() => assertTransferCounts(rows, accepted));
});
