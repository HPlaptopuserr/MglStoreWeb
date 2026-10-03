import assert from "node:assert/strict";
import test from "node:test";
import type { PosReceipt } from "@mgl/types";
import { createSalesHistoryDemo } from "./sales-history-demo";
import { summarizeSoldProducts } from "./sold-product-summary";
import { filterSalesHistory } from "./sales-history-filters";
import { buildSalesExportRows } from "./sales-export-rows";

function receipt(id: string, createdAt: string, quantity: number): PosReceipt {
  const source = createSalesHistoryDemo()[0];
  return {
    ...source,
    id,
    receiptNo: id,
    createdAt,
    lines: [{ ...source.lines[0], qty: quantity, lineTotal: quantity * 100 }],
  };
}

test("repeated sales merge despite changed SKU/barcode, with newest metadata and receipt details", () => {
  const first = receipt("first", "2026-10-01T01:00:00Z", 1);
  first.lines.push({ ...first.lines[0], qty: 2, lineTotal: 200 });
  const latest = receipt("latest", "2026-10-02T01:00:00Z", 4);
  latest.lines[0] = {
    ...latest.lines[0],
    sku: "NEW-SKU",
    barcode: "NEW-CODE",
    measureUnit: "pcs",
  };
  const voided = {
    ...receipt("void", "2026-10-03T01:00:00Z", 100),
    status: "VOIDED",
  };
  const rows = summarizeSoldProducts([first, voided, latest]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].quantity, 7);
  assert.equal(rows[0].amount, 700);
  assert.equal(rows[0].receiptCount, 2);
  assert.equal(rows[0].sku, "NEW-SKU");
  assert.equal(rows[0].sales[0].receipt.id, "latest");
  assert.equal(rows[0].sales[1].line.barcode, first.lines[0].barcode);
});

test("same-name distinct products and incompatible historical units stay separate", () => {
  const first = receipt("first", "2026-10-01T01:00:00Z", 1);
  const other = receipt("other", "2026-10-01T02:00:00Z", 2);
  other.lines[0].productId = "different-product";
  const weighed = receipt("weighed", "2026-10-01T03:00:00Z", 0.125);
  weighed.lines[0].measureUnit = "kg";
  const rows = summarizeSoldProducts([first, other, weighed]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].productId, "different-product");
  assert.equal(rows[2].quantity, 0.125);
  assert.equal(rows[2].unit, "кг");
});

test("employee and inclusive local-date filters apply before grouping, and Excel matches the summary", () => {
  const beforeMidnight = receipt("one", "2026-10-01T15:59:59Z", 0.1);
  const nextDay = receipt("two", "2026-10-01T16:00:00Z", 0.2);
  const otherEmployee = receipt("three", "2026-10-01T15:59:00Z", 3);
  otherEmployee.cashierId = "other";
  const selected = filterSalesHistory(
    [beforeMidnight, nextDay, otherEmployee],
    "2026-10-01",
    beforeMidnight.cashierId || "",
    "2026-10-01",
  );
  assert.equal(selected.length, 1);
  assert.equal(summarizeSoldProducts(selected)[0].quantity, 0.1);
  const all = [beforeMidnight, nextDay];
  const summary = summarizeSoldProducts(all);
  const exported = buildSalesExportRows(all).totals;
  assert.equal(summary[0].quantity, 0.3);
  assert.equal(exported[0]["Зарагдсан тоо хэмжээ"], summary[0].quantity);
  assert.equal(exported[0]["Борлуулалтын дүн"], summary[0].amount);
  assert.equal(exported[0]["Баримтын тоо"], 2);
});
