import assert from "node:assert/strict";
import { test } from "node:test";
import type { Prisma } from "@mgl/database";
import {
  canReserveStock,
  stockReservationShortage,
  reservedStock,
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

function reservationDb(physicalQuantity: number, reservedQuantity: number) {
  let locked = false;
  const db = {
    $queryRaw: async () => {
      locked = true;
      return [];
    },
    warehouseInventory: {
      findMany: async (args: Prisma.WarehouseInventoryFindManyArgs) => {
        assert.ok(locked, "lock inventory before reading availability");
        assert.equal(args.where?.warehouseId, "central");
        return [{ productId: "tea", quantity: physicalQuantity }];
      },
    },
    warehouseStockRequestItem: {
      findMany: async () => [
        {
          productId: "tea",
          quantity: reservedQuantity,
          approvedQuantity: null,
          request: { status: "PENDING" },
        },
      ],
    },
    warehouseRetailOrderItem: { findMany: async () => [] },
  } as unknown as Prisma.TransactionClient;
  return db;
}

test("manual dispatch reports physical stock, reservations and the actual shortage", async () => {
  const shortage = await stockReservationShortage(
    reservationDb(20, 18),
    "central",
    [{ productId: "tea", quantity: 3 }],
  );
  assert.deepEqual(shortage, {
    productId: "tea",
    requestedQuantity: 3,
    quantity: 2,
    physicalQuantity: 20,
    reservedQuantity: 18,
  });
  assert.equal(
    await canReserveStock(reservationDb(20, 18), "central", [
      { productId: "tea", quantity: 2 },
    ]),
    true,
  );
  assert.equal(
    await canReserveStock(reservationDb(20, 18), "central", [
      { productId: "tea", quantity: 3 },
    ]),
    false,
  );
});

test("availability checks aggregate duplicate lines and reject missing inventory", async () => {
  assert.equal(
    (
      await stockReservationShortage(reservationDb(20, 18), "central", [
        { productId: "tea", quantity: 2 },
        { productId: "tea", quantity: 1 },
      ])
    )?.requestedQuantity,
    3,
  );
  assert.equal(
    (
      await stockReservationShortage(reservationDb(20, 0), "central", [
        { productId: "missing", quantity: 1 },
      ])
    )?.quantity,
    0,
  );
  assert.equal(
    (
      await stockReservationShortage(reservationDb(2, 20), "central", [
        { productId: "tea", quantity: 1 },
      ])
    )?.quantity,
    0,
  );
  assert.equal(
    await canReserveStock(reservationDb(20, 0), "central", []),
    false,
  );
});

test("dispatch availability also subtracts unexpired unpaid retail orders", async () => {
  const db = reservationDb(20, 5);
  const retailDb = {
    ...db,
    warehouseRetailOrderItem: {
      findMany: async (args: Prisma.WarehouseRetailOrderItemFindManyArgs) => {
        const order = args.where
          ?.order as Prisma.WarehouseRetailOrderWhereInput;
        assert.equal(order.warehouseId, "central");
        assert.equal(order.paymentStatus, "PENDING");
        assert.ok(
          (order.expiresAt as Prisma.DateTimeFilter).gt instanceof Date,
        );
        return [{ productId: "tea", storedQuantity: 12 }];
      },
    },
  } as unknown as Prisma.TransactionClient;
  assert.equal(
    (await reservedStock("central", ["tea"], retailDb)).get("tea"),
    17,
  );
  assert.equal(
    (
      await stockReservationShortage(retailDb, "central", [
        { productId: "tea", quantity: 4 },
      ])
    )?.quantity,
    3,
  );
});
