import assert from "node:assert/strict";
import test from "node:test";
import type { StocktakeDetail } from "@mgl/types";
import { buildStocktakeWorkbook } from "./stocktake-workbook";

const session: StocktakeDetail = {
  id: "test",
  title: "Тооллого",
  kind: "PARTIAL",
  status: "APPROVED",
  warehouseId: null,
  warehouse: null,
  version: 1,
  createdAt: "2026-10-07T00:00:00Z",
  approvedAt: "2026-10-09T08:00:00Z",
  createdById: "user",
  approvedById: "user",
  lines: Array.from({ length: 61 }, (_, index) => ({
    id: String(index),
    productId: String(index),
    name: "=literal product",
    barcode: "00123456789012345678",
    barcodeAliases: [],
    unit: "kg",
    expected: 2500,
    counted: index === 0 ? null : 1250,
    note: "",
    countedAt: null,
    countedById: null,
    product: {
      name: "=literal product",
      barcode: "00123456789012345678",
      sku: "00042",
      barcodeAliases: [],
    },
  })),
};

test("exports every line, preserves text identifiers and historical scaled quantities after XLSX roundtrip", async () => {
  const workbook = buildStocktakeWorkbook(session);
  await workbook.xlsx.load(await workbook.xlsx.writeBuffer());
  const sheet = workbook.getWorksheet("Тооллогын тайлан")!;
  assert.equal(sheet.rowCount, 62);
  assert.equal(sheet.getCell("B3").value, "=literal product");
  assert.equal(sheet.getCell("C3").value, "00123456789012345678");
  assert.equal(sheet.getCell("D3").value, "00042");
  assert.equal(sheet.getCell("F3").value, 2.5);
  assert.equal(sheet.getCell("G3").value, 1.25);
  assert.equal(sheet.getCell("H3").value, -1.25);
  assert.equal(sheet.getCell("G2").value, 2.5);
  assert.equal(sheet.getCell("H2").value, 0);
  assert.equal(sheet.getCell("I2").value, "Тоолоогүй — өөрчлөгдөөгүй");
});

test("requires an approved nonempty stocktake", () => {
  assert.throws(() => buildStocktakeWorkbook({ ...session, status: "REVIEW" }));
  assert.throws(() => buildStocktakeWorkbook({ ...session, lines: [] }));
});

test("keeps explicit zero counts and missing SKU without inventing identifiers", () => {
  const source = session.lines[0]!;
  const workbook = buildStocktakeWorkbook({
    ...session,
    lines: [
      {
        ...source,
        unit: "pcs",
        expected: 180,
        counted: 0,
        product: undefined,
        barcode: null,
      },
    ],
  });
  const sheet = workbook.getWorksheet("Тооллогын тайлан")!;
  assert.equal(sheet.getCell("C2").value, "");
  assert.equal(sheet.getCell("D2").value, "");
  assert.equal(sheet.getCell("F2").value, 180);
  assert.equal(sheet.getCell("G2").value, 0);
  assert.equal(sheet.getCell("H2").value, -180);
});
