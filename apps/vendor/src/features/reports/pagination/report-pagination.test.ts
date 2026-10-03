import assert from "node:assert/strict";
import test from "node:test";
import { paginateReportRows } from "./report-pagination";
import { createSalesHistoryDemo } from "../../pos/utils/sales-history-demo";
import { buildSalesExportSheets } from "../../pos/utils/export-daily-sales";

test("pages contain every row once with correct ranges and a partial last page", () => {
  const rows = Array.from({ length: 53 }, (_, index) => index + 1);
  const pages = [1, 2, 3].map((page) => paginateReportRows(rows, page, 20));
  assert.deepEqual(
    pages.flatMap((page) => page.rows),
    rows,
  );
  assert.deepEqual(
    pages.map(({ start, end }) => [start, end]),
    [
      [0, 20],
      [20, 40],
      [40, 53],
    ],
  );
  assert.equal(pages[2].rows.length, 13);
  assert.equal(pages[2].pageCount, 3);
  assert.equal(rows.length, 53);
});

test("empty results, page size changes and invalid page requests stay in bounds", () => {
  assert.deepEqual(paginateReportRows([], 99, 20).rows, []);
  assert.equal(paginateReportRows([], 99, 20).page, 1);
  const rows = Array.from({ length: 53 }, (_, index) => index);
  assert.equal(paginateReportRows(rows, 3, 50).page, 2);
  assert.equal(paginateReportRows(rows, -1, 20).page, 1);
  assert.equal(paginateReportRows(rows, NaN, 20).page, 1);
  assert.equal(paginateReportRows(rows, 1, Infinity).pageSize, 20);
  assert.equal(paginateReportRows(rows, 1, 0).pageSize, 1);
});

test("visible pagination leaves all filtered sales in the Excel export", () => {
  const receipts = createSalesHistoryDemo();
  const exported = buildSalesExportSheets(receipts, "details");
  const page = paginateReportRows<unknown>(exported[0].rows, 1, 2);
  assert.equal(page.rows.length, 2);
  assert.equal(buildSalesExportSheets(receipts, "details")[0].rows.length, 5);
});
