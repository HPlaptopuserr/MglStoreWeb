import assert from "node:assert/strict";
import { test } from "node:test";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import {
  catalogGroups,
  createCatalogDocument,
  renderCatalogPdf,
  type CatalogItem,
} from "./warehouse-catalog-pdf";

function item(index: number): CatalogItem {
  return {
    id: String(index),
    quantity: 5,
    imageUrl: index % 2 ? "fixture" : undefined,
    product: {
      id: String(index),
      name: "Монгол үсэг Өө Үү - Ногоон цай ".repeat(index === 0 ? 8 : 1),
      sku: `SKU-${index}`,
      barcode: null,
      price: "4500",
      unit: "ш",
      businessCategory: { name: "Цай", parent: { name: "Хүнс" } },
    },
  };
}

test("streamed catalog embeds images and Mongolian text, includes every item and category", async () => {
  const items = Array.from({ length: 14 }, (_, index) => item(index));
  items.push({
    ...item(14),
    product: { ...item(14).product, businessCategory: null },
  });
  assert.deepEqual(
    new Set(catalogGroups(items).map(([name]) => name)),
    new Set(["Хүнс / Цай", "Ангилалгүй"]),
  );
  const jpeg = await sharp({
    create: { width: 24, height: 24, channels: 3, background: "#16a34a" },
  })
    .jpeg()
    .toBuffer();
  const doc = createCatalogDocument();
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.once("end", () => resolve(Buffer.concat(chunks)));
    doc.once("error", reject);
  });
  const result = await renderCatalogPdf({
    document: doc,
    items,
    warehouseName: "Төв агуулах",
    scopeLabel: "Зөвхөн нөөцтэй бараа",
    signal: new AbortController().signal,
    loadImage: async () => jpeg,
  });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.ok(
    chunks.length > 0,
    "PDF chunks stream before the document is finalized",
  );
  doc.end();
  const pdf = await PDFDocument.load(await finished);
  assert.equal(pdf.getPageCount(), 3);
  assert.equal(pdf.getTitle(), "Төв агуулах - Худалдааны каталог");
  assert.equal(result.itemCount, 15);
  assert.equal(result.missingImages, 8);
});

test("cancelled downloads stop rendering before fetching an image", async () => {
  const controller = new AbortController();
  controller.abort();
  const doc = createCatalogDocument();
  try {
    await assert.rejects(
      renderCatalogPdf({
        document: doc,
        items: [item(1)],
        warehouseName: "Төв",
        scopeLabel: "",
        signal: controller.signal,
        loadImage: async () => {
          throw new Error("must not load");
        },
      }),
      { name: "AbortError" },
    );
  } finally {
    doc.destroy();
  }
});
