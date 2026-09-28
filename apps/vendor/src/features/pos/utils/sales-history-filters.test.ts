import assert from "node:assert/strict";
import test from "node:test";
import { createSalesHistoryDemo } from "./sales-history-demo";
import { filterSalesHistory, salesDay } from "./sales-history-filters";

const receipts = createSalesHistoryDemo(new Date("2026-09-29T04:00:00Z"));
test("all days, individual days and employees compose without losing voided history", () => {
  assert.equal(filterSalesHistory(receipts, "", "").length, 6);
  assert.equal(filterSalesHistory(receipts, "2026-09-29", "").length, 2);
  assert.equal(filterSalesHistory(receipts, "", "demo-cashier-0").length, 3);
  assert.equal(
    filterSalesHistory(receipts, "2026-09-28", "demo-cashier-1").length,
    1,
  );
  assert.equal(filterSalesHistory(receipts, "2026-08-01", "").length, 0);
  assert.equal(filterSalesHistory(receipts, "", "missing").length, 0);
  assert.equal(
    filterSalesHistory(receipts, "2026-09-27", "demo-cashier-1")[0].status,
    "VOIDED",
  );
});
test("Mongolian day boundary uses Ulaanbaatar time", () => {
  assert.equal(salesDay("2026-09-28T15:59:59Z"), "2026-09-28");
  assert.equal(salesDay("2026-09-28T16:00:00Z"), "2026-09-29");
});
