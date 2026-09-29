import assert from "node:assert/strict";
import test from "node:test";
import { createReportDemo } from "./report-demo";
import { buildSalesExportRows } from "../pos/utils/sales-export-rows";
import { filterSalesHistory } from "../pos/utils/sales-history-filters";

test("report demo fills product and sales exports within a selected historical range", () => {
  const demo = createReportDemo("2025-01-15", "2025-01-15");
  assert.equal(demo.products.length, 2);
  for (const product of demo.products) {
    for (const value of [product.name, product.sku, product.barcode, product.description, product.price, product.costPrice, product.wholesalePrice, product.stock, product.businessCategory?.name]) {
      assert.ok(value != null && value !== "");
    }
    assert.ok(product.createdAt.startsWith("2025-01-15"));
  }
  const rows = buildSalesExportRows(filterSalesHistory(demo.receipts, "2025-01-15", "", "2025-01-15"));
  assert.equal(rows.details.length, 2);
  assert.equal(demo.bestSellingProducts.reduce((sum, product) => sum + product.revenue, 0), rows.details.reduce((sum, row) => sum + row["Борлуулалтын дүн"], 0));
  for (const row of rows.details) assert.ok(Object.values(row).every(value => value !== "" && value != null));
});
