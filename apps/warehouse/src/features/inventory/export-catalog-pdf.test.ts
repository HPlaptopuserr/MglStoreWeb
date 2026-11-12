import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { PDFDocument } from "pdf-lib";
import { createCatalogPdf } from "./export-catalog-pdf";
import { catalogItem } from "./catalog-test-fixtures";

test("PDF paginates every matching item, embeds Mongolian text, and tolerates broken images", async () => {
  const items = Array.from({ length: 14 }, (_, index) =>
    catalogItem(String(index)),
  );
  items[0].product.name = "Монгол үсэг Өө Үү, урт нэртэй бараа ".repeat(6);
  items[0].product.images = [
    { id: "broken", url: "https://example.invalid/broken.jpg" },
  ];
  const progress: number[] = [];
  const result = await createCatalogPdf(
    {
      groups: [
        { name: "Хүнс / Цай", items },
        { name: "Ангилалгүй", items: [catalogItem("last")] },
      ],
      warehouseName: "Төв агуулах",
      scopeLabel: "Зөвхөн нөөцтэй бараа",
      generatedAt: new Date("2026-11-12T02:00:00Z"),
      signal: new AbortController().signal,
      onProgress: (completed) => progress.push(completed),
    },
    {
      fontBytes: await readFile(
        path.resolve(process.cwd(), "public/fonts/NotoSans-Regular.ttf"),
      ),
      loadImage: async () => {
        throw new Error("missing");
      },
    },
  );
  const pdf = await PDFDocument.load(result.bytes);
  assert.equal(pdf.getPageCount(), 3);
  assert.equal(pdf.getTitle(), "Төв агуулах - Худалдааны каталог");
  assert.equal(result.itemCount, 15);
  assert.equal(result.missingImages, 15);
  assert.equal(progress.at(-1), 15);
});

test("PDF aborts before loading assets and rejects an empty catalog", async () => {
  const controller = new AbortController();
  controller.abort();
  const options = {
    warehouseName: "Төв агуулах",
    scopeLabel: "",
    signal: controller.signal,
  };
  await assert.rejects(
    createCatalogPdf({
      ...options,
      groups: [{ name: "Хүнс", items: [catalogItem("1")] }],
    }),
    { name: "AbortError" },
  );
  await assert.rejects(
    createCatalogPdf({ ...options, groups: [] }),
    /бараа олдсонгүй/,
  );
});
