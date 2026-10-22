import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProductLabelValue,
  calculatePrintLayout,
  renderProductLabelMarkup,
  type LabelPrintSettings,
} from "../src/organisms/ProductLabelPrintDialog";

import {
  DEFAULT_PRINT_SETTINGS,
  draftLabelValue,
} from "../src/organisms/product-label-print/layout";

const settings = (
  overrides: Partial<LabelPrintSettings>,
): LabelPrintSettings => ({
  ...DEFAULT_PRINT_SETTINGS,
  paperPreset: "A4",
  orientation: "landscape",
  customPaperWidth: 58,
  customPaperHeight: 40,
  labelWidth: 50,
  labelHeight: 30,
  margin: 4,
  gap: 0,
  ...overrides,
});

test("58 mm roll produces one exact 50 x 30 mm printable label page", () => {
  const layout = calculatePrintLayout(
    settings({ paperPreset: "THERMAL", thermalWidth: 58, thermalHeight: 38 }),
  );

  assert.deepEqual(
    {
      paperWidth: layout.paperWidth,
      paperHeight: layout.paperHeight,
      printableWidth: layout.printableWidth,
      printableHeight: layout.printableHeight,
      labelsPerPage: layout.labelsPerPage,
      fitsOnPage: layout.fitsOnPage,
    },
    {
      paperWidth: 58,
      paperHeight: 38,
      printableWidth: 50,
      printableHeight: 30,
      labelsPerPage: 1,
      fitsOnPage: true,
    },
  );
});

test("80 mm roll derives page height from label height and margins", () => {
  const layout = calculatePrintLayout(
    settings({
      paperPreset: "THERMAL",
      thermalWidth: 80,
      thermalHeight: 50,
      labelWidth: 70,
      labelHeight: 40,
      margin: 5,
    }),
  );

  assert.equal(layout.paperWidth, 80);
  assert.equal(layout.paperHeight, 50);
  assert.equal(layout.printableWidth, 70);
  assert.equal(layout.printableHeight, 40);
  assert.equal(layout.labelsPerPage, 1);
  assert.equal(layout.fitsOnPage, true);
});

test("custom paper dimensions are used without preset scaling", () => {
  const layout = calculatePrintLayout(
    settings({
      paperPreset: "CUSTOM",
      customPaperWidth: 64,
      customPaperHeight: 45,
      labelWidth: 60,
      labelHeight: 41,
      margin: 2,
    }),
  );

  assert.equal(layout.paperWidth, 64);
  assert.equal(layout.paperHeight, 45);
  assert.equal(layout.printableWidth, 60);
  assert.equal(layout.printableHeight, 41);
  assert.equal(layout.fitsOnPage, true);
});

test("layout rejects a label wider than the selected roll's printable area", () => {
  const layout = calculatePrintLayout(
    settings({
      paperPreset: "CUSTOM",
      customPaperWidth: 58,
      customPaperHeight: 38,
      labelWidth: 50.1,
    }),
  );

  assert.equal(layout.fitsOnPage, false);
});

test("product label includes the stored wholesale price", () => {
  const label = buildProductLabelValue({
    id: "product-1",
    name: "Туршилтын бараа",
    barcode: "8650000000011",
    price: 25_000,
    wholesalePrice: 22_000,
  });

  assert.equal(label.priceText, "25000₮");
  assert.equal(label.wholesalePriceText, "22000₮");

  const retail = renderProductLabelMarkup(draftLabelValue(label, "retail"));
  const wholesale = renderProductLabelMarkup(
    draftLabelValue(label, "wholesale"),
  );
  assert.match(retail, /ЭНГИЙН ҮНЭ:/);
  assert.match(retail, /25000₮/);
  assert.doesNotMatch(retail, /22000₮/);
  assert.match(wholesale, /БӨӨНИЙ ҮНЭ:/);
  assert.match(wholesale, /22000₮/);
  assert.doesNotMatch(wholesale, /25000₮/);
});

test("missing wholesale price stays blank instead of printing a false zero", () => {
  const label = buildProductLabelValue({
    id: "product-2",
    name: "Бөөний үнэ тохируулаагүй бараа",
    sku: "SKU-002",
    price: 10_000,
    wholesalePrice: null,
  });

  assert.equal(label.wholesalePriceText, "");
});
