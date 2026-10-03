import assert from "node:assert/strict";
import test from "node:test";
import { buildSalesExportSheets } from "./export-daily-sales";
import { buildSalesExportRows } from "./sales-export-rows";
import { createSalesHistoryDemo } from "./sales-history-demo";

test("summary export includes grouped products and excludes individual sale sheets", () => {
  const receipts = createSalesHistoryDemo();
  const sheets = buildSalesExportSheets(receipts, "summary");
  assert.deepEqual(
    sheets.map((sheet) => sheet.name),
    ["Бараагаар нэгтгэл"],
  );
  assert.deepEqual(sheets[0].rows, buildSalesExportRows(receipts).totals);
});

test("details export contains only the selected sale table", () => {
  const receipts = createSalesHistoryDemo();
  const sheets = buildSalesExportSheets(receipts, "details");
  assert.deepEqual(
    sheets.map((sheet) => sheet.name),
    ["Борлуулалтын дэлгэрэнгүй"],
  );
  assert.deepEqual(sheets[0].rows, buildSalesExportRows(receipts).details);
});

test("existing all-sheet export remains supported and empty exports fail clearly", () => {
  assert.equal(
    buildSalesExportSheets(createSalesHistoryDemo(), "all").length,
    4,
  );
  assert.throws(
    () => buildSalesExportSheets([], "summary"),
    /зарагдсан бараа байхгүй/,
  );
  assert.throws(
    () => buildSalesExportSheets([], "details"),
    /зарагдсан бараа байхгүй/,
  );
});
