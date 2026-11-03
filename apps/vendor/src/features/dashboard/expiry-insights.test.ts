import test from "node:test";
import assert from "node:assert/strict";
import {
  filterExpiryProducts,
  type ExpiryInsightProduct,
} from "./expiry-insights";
const rows: ExpiryInsightProduct[] = [-1, 0, 7, 14, 15].map((days, i) => ({
  inventoryId: String(i),
  productId: String(i),
  name: `Бараа ${i}`,
  sku: `SKU-${i}`,
  imageUrl: null,
  warehouseName: "Үндсэн",
  quantity: 10,
  expiryDate: "2026-10-20",
  daysUntilExpiry: days,
  salesLast30Days: i,
  dailyVelocity: 0,
  sellThroughDays: null,
  riskScore: i * 10,
  riskLevel: "high",
  stockValue: 100 - i,
  recommendation: "check",
}));
test("urgent filter includes today and day 14, excludes expired and day 15", () => {
  assert.deepEqual(
    filterExpiryProducts(rows, "urgent", "", "date").map(
      (p) => p.daysUntilExpiry,
    ),
    [0, 7, 14],
  );
  assert.deepEqual(
    filterExpiryProducts(rows, "expired", "", "date").map(
      (p) => p.daysUntilExpiry,
    ),
    [-1],
  );
});
test("search combines with filters and sorting without mutating the source", () => {
  assert.equal(
    filterExpiryProducts(rows, "stagnant", "sku-0", "risk").length,
    1,
  );
  assert.equal(filterExpiryProducts(rows, "urgent", "sku-0", "risk").length, 0);
  assert.equal(
    filterExpiryProducts(rows, "all", " үндсэн ", "value")[0].inventoryId,
    "0",
  );
  assert.equal(
    filterExpiryProducts(rows, "all", "", "risk")[0].inventoryId,
    "4",
  );
  assert.equal(rows[0].inventoryId, "0");
});
