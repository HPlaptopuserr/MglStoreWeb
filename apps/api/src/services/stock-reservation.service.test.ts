import assert from "node:assert/strict";
import { test } from "node:test";
import {
  approvedStockRequestQuantity,
  stockAvailability,
  sumReservedStock,
} from "./stock-reservation.service";

test("catalog exposes physical, reserved and orderable quantities separately", () => {
  assert.deepEqual(stockAvailability(19, 19), {
    quantity: 0,
    physicalQuantity: 19,
    reservedQuantity: 19,
  });
  assert.deepEqual(stockAvailability(19, 2), {
    quantity: 17,
    physicalQuantity: 19,
    reservedQuantity: 2,
  });
});

test("approved quantity preserves an explicit zero", () => {
  assert.equal(
    approvedStockRequestQuantity({ quantity: 19, approvedQuantity: 0 }),
    0,
  );
  assert.equal(
    approvedStockRequestQuantity({ quantity: 19, approvedQuantity: null }),
    19,
  );
});

test("reservations include requests before physical stock is deducted", () => {
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
      request: { status: "PROCESSING", dispatch: { status: "PENDING" } },
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

test("confirmed and dispatched processing requests do not reserve deducted stock again", () => {
  for (const dispatchStatus of ["CONFIRMED", "DISPATCHED", "DELIVERED"]) {
    const reserved = sumReservedStock([
      {
        productId: "tea-150g",
        quantity: 19,
        approvedQuantity: 19,
        request: {
          status: "PROCESSING",
          dispatch: { status: dispatchStatus },
        },
      },
    ]);
    assert.equal(reserved.size, 0);
  }
});

test("legacy processing requests without a dispatch remain reserved", () => {
  const reserved = sumReservedStock([
    {
      productId: "tea-150g",
      quantity: 19,
      approvedQuantity: 17,
      request: { status: "PROCESSING", dispatch: null },
    },
  ]);
  assert.equal(reserved.get("tea-150g"), 17);
});
