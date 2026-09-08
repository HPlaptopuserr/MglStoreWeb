import assert from "node:assert/strict";
import { test } from "node:test";
import { sumReservedStock } from "./stock-reservation.service";

test("reservations include pending requests and preserve zero approved quantity", async () => {
  const rows = [
    {
      productId: "p",
      quantity: 10,
      approvedQuantity: null,
      request: { status: "PENDING" },
    },
    {
      productId: "p",
      quantity: 8,
      approvedQuantity: 3,
      request: { status: "APPROVED" },
    },
    {
      productId: "p",
      quantity: 6,
      approvedQuantity: 0,
      request: { status: "PROCESSING" },
    },
  ];
  assert.equal(sumReservedStock(rows).get("p"), 13);
  for (const status of ["CANCELLED", "REJECTED", "COMPLETED"]) {
    assert.equal(
      sumReservedStock([{ ...rows[0], request: { status } }]).size,
      0,
    );
  }
});
