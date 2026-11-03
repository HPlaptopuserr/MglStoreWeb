import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { createProductReportSheet } from "./export-product-report";
import { createReportDemo } from "./report-demo";

test("Excel round trip preserves separate SKU and barcode strings, including missing codes", () => {
  const base = createReportDemo("2026-10-14").products[0];
  const products = [
    { ...base, sku: "VC5-MGL-001", barcode: "0012345678905" },
    { ...base, sku: null, barcode: "00001234" },
    { ...base, sku: "00042", barcode: null },
    { ...base, sku: null, barcode: null },
  ];
  const original = structuredClone(products);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, createProductReportSheet(XLSX, products), "Products");
  const restored = XLSX.read(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }), { type: "buffer" });
  const sheet = restored.Sheets.Products;
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { defval: "" });

  products.forEach((product, index) => {
    assert.equal(rows[index]["SKU код"], product.sku ?? "");
    assert.equal(rows[index].Баркод, product.barcode ?? "");
    assert.equal(rows[index].Бүтээгдэхүүн, product.name);
    assert.equal(rows[index].Үлдэгдэл, product.stock);
    assert.equal("SKU / Баркод" in rows[index], false);
  });
  assert.equal(sheet.C2.t, "s");
  assert.equal(sheet.D2.t, "s");
  assert.deepEqual(products, original);
});
