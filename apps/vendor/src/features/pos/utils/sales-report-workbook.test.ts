import assert from "node:assert/strict";
import test from "node:test";
import { Workbook } from "exceljs";
import { buildSalesReportWorkbook } from "./sales-report-workbook";
import { createSalesHistoryDemo } from "./sales-history-demo";
import { buildSalesExportRows } from "./sales-export-rows";

// Read the actual serialized XLSX, not just the builder's in-memory objects.
async function restore(view: "summary" | "details", missingCost = false) {
  const receipts = createSalesHistoryDemo();
  if (missingCost) {
    receipts[0].lines[0].unitCost = null;
    receipts[0].lines[0].costTotal = null;
  }
  const source = buildSalesReportWorkbook(receipts, view, {
    from: "2026-09-01",
    to: "2026-10-03",
    cashierName: "Тест",
    test: true,
  });
  const workbook = new Workbook();
  await workbook.xlsx.load(await source.xlsx.writeBuffer());
  return { workbook, receipts };
}

test("summary XLSX contains a real styled table, all rows, frozen headings and preserved text codes", async () => {
  const { workbook, receipts } = await restore("summary");
  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ["Бараагаар нэгтгэл"],
  );
  const sheet = workbook.getWorksheet("Бараагаар нэгтгэл")!;
  const rows = buildSalesExportRows(receipts).totals;
  assert.ok(sheet.getTable("SalesReport1"));
  assert.equal(sheet.getCell(rows.length + 1, 1).value, rows.at(-1)!.Бараа);
  assert.ok(sheet.getTable("SalesFinancials1"));
  assert.equal(sheet.getCell(rows.length + 5, 1).value, "Санхүүгийн нэгтгэл");
  assert.equal(
    sheet.getCell(rows.length + 6, 2).value,
    rows.reduce((sum, row) => sum + row["Борлуулалтын дүн"], 0),
  );
  assert.equal(sheet.views[0].state, "frozen");
  assert.equal(sheet.getCell("D2").value, "ш");
  assert.equal(sheet.getCell("A1").value, "Бараа");
  assert.equal(sheet.views[0].ySplit, 1);
  assert.equal(workbook.views[0].activeTab, 0);
  const headers = Object.keys(rows[0]);
  const barcodeColumn = headers.indexOf("Баркод") + 1;
  assert.equal(sheet.getCell(2, barcodeColumn).value, rows[0].Баркод);
  assert.equal(typeof sheet.getCell(2, barcodeColumn).value, "string");
  const profitColumn = headers.indexOf("Барааны ашиг") + 1;
  const footer = sheet.getCell(2 + rows.length, profitColumn).value;
  assert.equal(typeof footer, "object");
  assert.ok(
    footer &&
      typeof footer === "object" &&
      "formula" in footer &&
      typeof footer.formula === "string" &&
      footer.formula.includes("SUBTOTAL"),
  );
  const marginColumn = headers.indexOf("Ашгийн хувь (%)") + 1;
  assert.match(sheet.getCell(2, marginColumn).numFmt, /%/);
});

test("details XLSX opens directly on the sale table with a clear incomplete cost footer", async () => {
  const { workbook, receipts } = await restore("details", true);
  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ["Борлуулалтын дэлгэрэнгүй"],
  );
  const sheet = workbook.getWorksheet("Борлуулалтын дэлгэрэнгүй")!;
  const rows = buildSalesExportRows(receipts).details;
  const headers = Object.keys(rows[0]);
  const costColumn = headers.indexOf("Нийт өртөг (борлуулалтын үеийн)") + 1;
  const profitColumn = headers.indexOf("Барааны ашиг") + 1;
  assert.equal(sheet.getCell(2, profitColumn).value, "");
  assert.equal(
    sheet.getCell(2 + rows.length, costColumn).value,
    "Мэдээлэл дутуу",
  );
  assert.equal(
    sheet.getCell(2 + rows.length, profitColumn).value,
    "Мэдээлэл дутуу",
  );
  assert.equal(sheet.getCell("A1").value, "Бараа");
  assert.equal(workbook.views[0].activeTab, 0);
});
