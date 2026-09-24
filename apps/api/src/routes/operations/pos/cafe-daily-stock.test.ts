import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCafeRemaining,
  calculateCafeTotals,
  parseCafeBusinessDate,
  sumCafeReceivedQuantities,
} from "./cafe-daily-stock";

test("parseCafeBusinessDate uses the Ulaanbaatar business day", () => {
  const parsed = parseCafeBusinessDate("2026-09-24");
  assert.ok(parsed);
  assert.equal(parsed.databaseDate.toISOString(), "2026-09-24T00:00:00.000Z");
  assert.equal(parsed.startUtc.toISOString(), "2026-09-23T16:00:00.000Z");
  assert.equal(parsed.endUtc.toISOString(), "2026-09-24T16:00:00.000Z");
});

test("parseCafeBusinessDate rejects invalid calendar dates", () => {
  assert.equal(parseCafeBusinessDate("2026-02-30"), null);
  assert.equal(parseCafeBusinessDate("09/24/2026"), null);
});

test("daily remaining subtracts sales and waste from available quantity", () => {
  assert.equal(
    calculateCafeRemaining({
      openingQty: 5,
      receivedQty: 30,
      soldQty: 18,
      wasteQty: 2,
    }),
    15,
  );
});

test("daily totals preserve fractional quantities", () => {
  assert.deepEqual(
    calculateCafeTotals([
      { openingQty: 2, receivedQty: 10.5, soldQty: 4, wasteQty: 0.5 },
      { openingQty: 1, receivedQty: 5, soldQty: 2.25, wasteQty: 0 },
    ]),
    {
      openingQty: 3,
      receivedQty: 15.5,
      soldQty: 6.25,
      wasteQty: 0.5,
      remainingQty: 11.75,
    },
  );
});

test("received totals accumulate entries and ignore voided receipts", () => {
  const totals = sumCafeReceivedQuantities([
    { productId: "drink", quantity: 10 },
    { productId: "drink", quantity: 20.5 },
    { productId: "cake", quantity: 30 },
    { productId: "cake", quantity: 5, voidedAt: new Date() },
  ]);
  assert.deepEqual(Object.fromEntries(totals), {
    drink: 30.5,
    cake: 30,
  });
});
