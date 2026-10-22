import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePrintLayout,
  createDraft,
  draftLabelValue,
  productPriceText,
  calculatePrintJob,
  chunkLabels,
  DEFAULT_PRINT_SETTINGS,
  type LabelPrintSettings,
  type ProductLabelValue,
} from "../src/organisms/product-label-print/layout";
import { buildLabelDocument } from "../src/organisms/product-label-print/document";

const label: ProductLabelValue = {
  productId: "fixture",
  name: "Alpen Gold Picnic mix",
  code: "7622202309939",
  priceText: "7150₮",
};
const settings = (changes: Partial<LabelPrintSettings> = {}) => ({
  ...DEFAULT_PRINT_SETTINGS,
  ...changes,
});

test("A4 preview and print use the chosen orientation and actual label capacity", () => {
  const landscape = calculatePrintLayout(settings());
  assert.equal(landscape.paperWidth, 297);
  assert.equal(landscape.paperHeight, 210);
  assert.equal(landscape.labelsPerPage, 6);
  const portrait = calculatePrintLayout(settings({ orientation: "portrait" }));
  assert.equal(portrait.paperWidth, 210);
  assert.equal(portrait.paperHeight, 297);
  assert.equal(portrait.labelsPerPage, 4);
  const html = buildLabelDocument(
    Array.from({ length: 5 }, () => label),
    settings({ orientation: "portrait" }),
  );
  assert.equal((html.match(/<section class="sheet">/g) ?? []).length, 2);
  assert.match(html, /size: 210mm 297mm; margin: 4mm/);
  assert.match(html, /grid-template-columns: repeat\(1, 144.5mm\)/);
});

test("58mm, 80mm and custom cash-printer paper produce one continuous roll", () => {
  for (const width of [58, 80, 72]) {
    const selected = settings({
      paperPreset: "THERMAL",
      thermalWidth: width,
      thermalHeight: 50,
      margin: 2,
    });
    const layout = calculatePrintLayout(selected);
    assert.equal(layout.paperWidth, width);
    assert.equal(layout.paperHeight, 50);
    assert.equal(layout.labelWidth, width - 4);
    assert.equal(layout.labelHeight, 46);
    assert.equal(layout.labelsPerPage, 1);
    const html = buildLabelDocument([label, label], selected);
    assert.match(html, new RegExp(`size: ${width}mm 100mm; margin: 0mm`));
    assert.equal(
      (html.match(/<section class="thermal-roll">/g) ?? []).length,
      1,
    );
    assert.equal((html.match(/<div class="roll-item">/g) ?? []).length, 2);
    assert.equal((html.match(/<section class="sheet">/g) ?? []).length, 0);
    assert.match(html, /\.thermal-logo path \{ fill: #111; \}/);
    assert.match(html, /\.thermal-label \{/);
  }
});

test("thermal paper length and margins determine the actual printable label", () => {
  const layout = calculatePrintLayout(
    settings({
      paperPreset: "THERMAL",
      thermalWidth: 58,
      thermalHeight: 80,
      margin: 3,
    }),
  );
  assert.equal(layout.labelWidth, 52);
  assert.equal(layout.labelHeight, 74);
  assert.equal(layout.fitsOnPage, true);
});

test("oversized labels and invalid printable areas cannot be printed", () => {
  for (const selected of [
    settings({ labelWidth: 300 }),
    settings({
      paperPreset: "THERMAL",
      thermalWidth: 58,
      thermalHeight: 24,
      margin: 20,
    }),
    settings({ labelWidth: NaN }),
    settings({ margin: -1 }),
  ]) {
    assert.equal(calculatePrintLayout(selected).fitsOnPage, false);
    assert.throws(() => buildLabelDocument([label], selected));
  }
});

test("gap is included between rows and columns and page boundaries retain all labels", () => {
  const layout = calculatePrintLayout(
    settings({
      orientation: "portrait",
      labelWidth: 100,
      labelHeight: 50,
      gap: 4,
    }),
  );
  assert.equal(layout.columns, 1);
  assert.equal(layout.rows, 5);
  const labels = Array.from({ length: 11 }, (_, index) => ({
    ...label,
    productId: String(index),
  }));
  const pages = chunkLabels(labels, layout.labelsPerPage);
  assert.deepEqual(
    pages.map((page) => page.length),
    [5, 5, 1],
  );
  assert.deepEqual(pages.flat(), labels);
  assert.throws(() => chunkLabels(labels, 0));
});

test("document safely escapes user content and includes no automatic script or close timer", () => {
  const html = buildLabelDocument(
    [
      {
        ...label,
        name: "</span><script>alert(1)</script>",
        code: '<img src=x onerror="bad()">',
        priceText: '"<&',
      },
    ],
    settings(),
  );
  assert(!html.includes("<script>"));
  assert(!html.includes("<img src=x"));
  assert.match(html, /&lt;script&gt;/);
  assert(!html.includes("window.print"));
  assert(!html.includes("setTimeout"));
});

test("all thermal copies stay in queue order with gap included once between labels", () => {
  const selected = settings({
    paperPreset: "THERMAL",
    thermalWidth: 80,
    thermalHeight: 50,
    margin: 2,
    gap: 3,
  });
  const labels = [
    { ...label, name: "FIRST-COPY" },
    { ...label, name: "FIRST-COPY" },
    { ...label, name: "SECOND-PRODUCT" },
  ];
  const job = calculatePrintJob(selected, labels.length);
  assert.equal(job.documentHeight, 156);
  assert.equal(job.pageCount, 1);
  const html = buildLabelDocument(labels, selected);
  assert.match(html, /size: 80mm 156mm; margin: 0mm/);
  assert.equal((html.match(/class="roll-item"/g) ?? []).length, 3);
  assert.equal((html.match(/FIRST-COPY/g) ?? []).length, 2);
  assert(html.lastIndexOf("FIRST-COPY") < html.indexOf("SECOND-PRODUCT"));
  assert.equal(calculatePrintJob(selected, 1).documentHeight, 50);
  assert.equal(calculatePrintJob(selected, 0).pageCount, 0);
});

test("retail and wholesale print their own amount and preserve independent edits", () => {
  const draft = createDraft({
    id: "price-test",
    name: "Coffee",
    price: "12000",
    wholesalePrice: "9500",
  });
  assert.equal(
    productPriceText(
      { id: "decimal", name: "Decimal", wholesalePrice: "9500.25" },
      "wholesale",
    ),
    "9500.25₮",
  );
  assert.equal(draftLabelValue(draft, "retail").priceText, "12000₮");
  assert.equal(draftLabelValue(draft, "wholesale").priceText, "9500₮");
  const edited = { ...draft, priceText: "11500₮", wholesalePriceText: "9000₮" };
  assert.equal(draftLabelValue(edited, "retail").priceText, "11500₮");
  assert.equal(draftLabelValue(edited, "wholesale").priceText, "9000₮");
  for (const paperPreset of ["A4", "THERMAL"] as const) {
    const html = buildLabelDocument(
      [draftLabelValue(edited, "wholesale")],
      settings({ paperPreset }),
    );
    assert(html.includes("Бөөний үнэ") || html.includes("БӨӨНИЙ ҮНЭ"));
    assert(!html.includes("11500"));
    assert(!html.includes("11,500"));
  }
});

test("missing wholesale never falls back to retail or silently prints zero", () => {
  for (const wholesalePrice of [undefined, null, "", "not-a-price", -1]) {
    const product = {
      id: "missing",
      name: "Coffee",
      price: 12000,
      wholesalePrice,
    };
    assert.equal(productPriceText(product, "wholesale"), "");
    assert.equal(
      draftLabelValue(createDraft(product), "wholesale").priceText,
      "",
    );
    assert.equal(productPriceText(product, "retail"), "12000₮");
  }
  assert.equal(
    productPriceText(
      { id: "free", name: "Free", wholesalePrice: 0 },
      "wholesale",
    ),
    "0₮",
  );
});
