import assert from "node:assert/strict";
import test from "node:test";
import type { WarehouseDispatchDocument } from "@mgl/types";
import { calculateDispatchSalePrices } from "./dispatch-sale-prices";

const items: WarehouseDispatchDocument["items"] = [
  {
    id: "a",
    productId: "p1",
    name: "Сүү",
    sku: null,
    quantity: 2,
    unitPrice: "1650.00",
    totalAmount: "3300.00",
  },
  {
    id: "b",
    productId: "p2",
    name: "Талх",
    sku: null,
    quantity: 10,
    unitPrice: "10.05",
    totalAmount: "100.50",
  },
];

test("one percentage applies to unit costs, rounds cents and leaves the padan unchanged", () => {
  assert.deepEqual(calculateDispatchSalePrices(items, "20"), {
    a: "1980.00",
    b: "12.06",
  });
  assert.equal(items[0].unitPrice, "1650.00");
  assert.equal(items[0].totalAmount, "3300.00");
  assert.equal(calculateDispatchSalePrices(items, "1")?.a, "1666.50");
  assert.equal(calculateDispatchSalePrices(items, "100")?.a, "3300.00");
});

test("invalid percentages and missing costs never create zero or invalid selling prices", () => {
  for (const percent of ["", "0", "101", "-1", "1.5", "1e1", "oops"])
    assert.equal(calculateDispatchSalePrices(items, percent), null);
  for (const unitPrice of [null, "", "0", "-1", "NaN", "1000000000"])
    assert.equal(
      calculateDispatchSalePrices([{ ...items[0], unitPrice }], "20"),
      null,
    );
});
