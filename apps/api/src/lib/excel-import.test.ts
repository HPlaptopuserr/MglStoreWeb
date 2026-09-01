import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import {
  addCategoryDropdownToWorkbook,
  PRODUCT_COL_MAP,
  resolveCol,
} from "./excel-import";

test("product import column map resolves the current product fields", () => {
  const row = {
    "Баркод (barcode)": "8650000000001",
    "Бөөний үнэ (wholesalePrice)": 22000,
    "Захиалгын үнэ (orderPrice)": 20000,
    "Дуусах хугацаа (expiryDate)": "2026-12-31",
    "Татварын төрөл (taxType)": "VAT_FREE",
    "Хотын татвар (cityTaxRate)": 2,
    "Ангиллын код (classificationCode)": "4711000",
    "Татварын ангиллын код (taxProductCode)": "0111100",
    "Marketplace дараалал (marketplacePriority)": 100,
  };

  assert.equal(resolveCol(row, PRODUCT_COL_MAP.barcode), "8650000000001");
  assert.equal(resolveCol(row, PRODUCT_COL_MAP.wholesalePrice), 22000);
  assert.equal(resolveCol(row, PRODUCT_COL_MAP.orderPrice), 20000);
  assert.equal(resolveCol(row, PRODUCT_COL_MAP.expiryDate), "2026-12-31");
  assert.equal(resolveCol(row, PRODUCT_COL_MAP.taxType), "VAT_FREE");
  assert.equal(resolveCol(row, PRODUCT_COL_MAP.cityTaxRate), 2);
  assert.equal(resolveCol(row, PRODUCT_COL_MAP.classificationCode), "4711000");
  assert.equal(resolveCol(row, PRODUCT_COL_MAP.taxProductCode), "0111100");
  assert.equal(resolveCol(row, PRODUCT_COL_MAP.marketplacePriority), 100);
});

test("template workbook receives category, tax type, and tax code dropdowns", async () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      [
        "Зураг",
        "Нэр (name)",
        "SKU (sku)",
        "Ангилал",
        "Баркод (barcode)",
        "Өртөг (costPrice)",
        "Бөөний үнэ (wholesalePrice)",
        "Захиалгын үнэ (orderPrice)",
        "Үнэ (price)",
        "Нөөц (stock)",
        "Дуусах хугацаа (expiryDate)",
        "Татварын төрөл (taxType)",
      ],
    ]),
    "Бараа",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([["Ангилал"], ["Хүнс"]]),
    "Ангиллууд",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Татварын төрөл"],
      ["VAT_ABLE"],
      ["VAT_FREE"],
      ["VAT_ZERO"],
      ["NOT_VAT"],
    ]),
    "Татварын төрөл",
  );

  const source = Buffer.from(
    XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
  );
  const result = await addCategoryDropdownToWorkbook(source, 1, "L", 51, "O");
  const zip = await JSZip.loadAsync(result);
  const sheetXml = await zip.file("xl/worksheets/sheet1.xml")!.async("text");

  assert.match(sheetXml, /sqref="D2:D1001"/);
  assert.match(sheetXml, /sqref="L2:L1001"/);
  assert.match(sheetXml, /sqref="O2:O1001"/);
  assert.match(sheetXml, /Ангиллууд/);
  assert.match(sheetXml, /Татварын төрөл/);
});
