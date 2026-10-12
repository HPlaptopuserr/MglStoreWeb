import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import type { ProductReceiptLot } from "@/features/products/types";
import { createReportDemo } from "./report-demo";
import {
  calculateProductInventoryValue,
  calculateProductReportTotals,
  calculateMarginPercent,
} from "./product-report";
import { createProductReportSheet } from "./export-product-report";

const base = {
  ...createReportDemo("2026-10-03").products[0],
  stock: 20,
  costPrice: 2000,
  price: 3000,
};
function lot(
  remainingQuantity: number,
  unitCost: number | null,
): ProductReceiptLot {
  return {
    id: String(unitCost),
    quantity: 100,
    remainingQuantity,
    unitCost,
    batchNumber: null,
    expiryDate: null,
    receiptNo: "R1",
    supplierName: "Test",
    receivedAt: "2026-10-01",
    branchName: "Test",
  };
}

test("old and new receipt costs value remaining stock, not original receipt quantities", () => {
  const product = { ...base, receiptLots: [lot(10, 2000), lot(10, 2500)] };
  const value = calculateProductInventoryValue(product);
  assert.equal(value.inventoryCost, 45000);
  assert.equal(value.averageCost, 2250);
  assert.equal(calculateMarginPercent(product), 25);
  assert.equal(
    calculateProductReportTotals([product]).projectedGrossProfit,
    15000,
  );
  const afterSale = {
    ...product,
    stock: 15,
    receiptLots: [lot(5, 2000), lot(10, 2500)],
  };
  assert.equal(calculateProductInventoryValue(afterSale).inventoryCost, 35000);
  assert.equal(calculateProductInventoryValue(product).inventoryCost, 45000);
});

test("legacy stock alone uses catalog cost, fully tracked stock needs no catalog cost", () => {
  assert.equal(
    calculateProductInventoryValue({ ...base, receiptLots: [lot(10, 2500)] })
      .inventoryCost,
    45000,
  );
  assert.equal(
    calculateProductInventoryValue({
      ...base,
      costPrice: null,
      receiptLots: [lot(20, 2500)],
    }).averageCost,
    2500,
  );
  assert.equal(calculateProductInventoryValue(base).inventoryCost, 40000);
});

test("missing or invalid lot costs remain unknown and do not inflate profit", () => {
  for (const cost of [null, -1, NaN, Infinity]) {
    const product = { ...base, receiptLots: [lot(10, 2500), lot(10, cost)] };
    const value = calculateProductInventoryValue(product);
    assert.equal(value.inventoryCost, 25000);
    assert.equal(value.missingCostQuantity, 10);
    assert.equal(value.averageCost, null);
    assert.equal(calculateMarginPercent(product), null);
    assert.equal(
      calculateProductReportTotals([product]).projectedGrossProfit,
      5000,
    );
    assert.equal(calculateProductReportTotals([product]).missingCostCount, 1);
  }
  assert.equal(
    calculateProductInventoryValue({ ...base, costPrice: null })
      .missingCostQuantity,
    20,
  );
});

test("kilograms and explicit zero costs are supported without rounding quantities", () => {
  const value = calculateProductInventoryValue({
    ...base,
    unit: "kg",
    stock: 0.3,
    receiptLots: [lot(0.1, 2000), lot(0.2, 2500)],
  });
  assert.equal(value.inventoryCost, 700);
  assert.equal(value.missingCostQuantity, 0);
  assert.equal(value.inconsistentLots, false);
  assert.equal(
    calculateProductInventoryValue({ ...base, receiptLots: [lot(20, 0)] })
      .averageCost,
    0,
  );
});

test("inconsistent lots are flagged instead of inventing which receipt remains", () => {
  const product = { ...base, stock: 5, receiptLots: [lot(10, 2500)] };
  assert.deepEqual(calculateProductInventoryValue(product), {
    inventoryCost: 0,
    knownCostQuantity: 0,
    missingCostQuantity: 5,
    averageCost: null,
    inconsistentLots: true,
  });
  assert.equal(calculateProductReportTotals([product]).inconsistentLotCount, 1);
  for (const stock of [0, -5]) {
    assert.equal(
      calculateProductInventoryValue({ ...base, stock }).inventoryCost,
      0,
    );
  }
});

test("Excel exposes the same weighted cost and valuation as the report", () => {
  const product = { ...base, receiptLots: [lot(10, 2000), lot(10, 2500)] };
  const sheet = createProductReportSheet(XLSX, [product]);
  const [row] =
    XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet);
  assert.equal(row["Дундаж өртөг"], 2250);
  assert.equal(row["Нөөцийн өртөг (мэдэгдэж буй)"], 45000);
  assert.equal(row["Ашгийн хувь"], 25);
  assert.equal(row["Өртөг дутуу үлдэгдэл"], 0);
});
