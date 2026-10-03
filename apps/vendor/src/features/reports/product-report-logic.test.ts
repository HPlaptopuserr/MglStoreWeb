import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateProductReportTotals,
  formatReportStock,
} from "./product-report";
import { createReportDemo } from "./report-demo";
import {
  emptyProductReportFilters,
  filterReportProducts,
  isValidReportRange,
} from "./product-report-filters";

test("inventory separates units and does not invent zero costs for missing cost", () => {
  const [product] = createReportDemo("2026-10-03").products;
  const rows: import("./product-report").ProductReportRow[] = [
    { ...product, stock: 3, price: 100, costPrice: 60, unit: "pcs" },
    {
      ...product,
      id: "kg",
      stock: 2.5,
      price: 200,
      costPrice: 100,
      unit: "kg",
    },
    { ...product, id: "unknown", stock: 10, price: 500, costPrice: null },
    { ...product, id: "negative", stock: -5, price: 100, costPrice: 60 },
  ];
  const totals = calculateProductReportTotals(rows);
  assert.equal(totals.productCount, 4);
  assert.deepEqual(totals.stockByUnit, { ш: 13, кг: 2.5 });
  assert.equal(totals.inventoryCost, 430);
  assert.equal(totals.projectedGrossProfit, 370);
  assert.equal(totals.missingCostCount, 1);
  assert.equal(totals.negativeStockCount, 1);
  assert.equal(formatReportStock(totals), "13 ш · 2.5 кг");
});

test("inventory defaults include all dates; invalid and optional inclusive local ranges are handled", () => {
  const rows = createReportDemo("2026-10-03").products;
  assert.equal(
    filterReportProducts(rows, emptyProductReportFilters).length,
    rows.length,
  );
  assert.equal(
    filterReportProducts(rows, {
      ...emptyProductReportFilters,
      from: "2026-10-04",
      to: "2026-10-03",
    }).length,
    0,
  );
  assert.equal(isValidReportRange("2026-10-04", "2026-10-03"), false);
  const boundary = {
    ...rows[0],
    createdAt: "2026-10-02T16:00:00Z",
    receiptLots: [],
  };
  assert.equal(
    filterReportProducts([boundary], {
      ...emptyProductReportFilters,
      from: "2026-10-03",
      to: "2026-10-03",
    }).length,
    1,
  );
  assert.equal(
    filterReportProducts([boundary], {
      ...emptyProductReportFilters,
      to: "2026-10-02",
    }).length,
    0,
  );
  assert.equal(
    filterReportProducts([{ ...boundary, createdAt: "invalid" }], {
      ...emptyProductReportFilters,
      from: "2026-10-03",
    }).length,
    0,
  );
});

test("search, status and category combine and preserve original source rows", () => {
  const rows = createReportDemo("2026-10-03").products;
  const target = rows[0];
  assert.deepEqual(
    filterReportProducts(rows, {
      ...emptyProductReportFilters,
      search: target.sku || target.name,
      status: "active",
      category: target.businessCategory?.name || "all",
    }),
    [target],
  );
  assert.equal(
    filterReportProducts(rows, {
      ...emptyProductReportFilters,
      status: "inactive",
    }).length,
    0,
  );
  assert.equal(rows.length, 2);
});
