import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@mgl/database";
import { createCatalogImageSearcher } from "./visual-search-service";
import { buildVisualSnapshot } from "./visual-search-builder";
import { imageSourceHash, type VisualEntry } from "./visual-search-index";
import type { VisualPublicProduct } from "./visual-search-products";
import { defaultVisualSearchOptions } from "./visual-search-options";

const vector = [1, ...Array<number>(511).fill(0)];
const product = (id: string): VisualPublicProduct => ({
  id,
  name: "Гутал",
  description: null,
  sku: null,
  barcode: null,
  price: new Prisma.Decimal(1000),
  stock: 2,
  unit: null,
  supplyType: "IN_STOCK",
  isRestaurantMenuItem: false,
  menuCategory: null,
  images: [{ id, url: `https://example.test/${id}.jpg` }],
  businessCategory: null,
  organization: { id: "org", name: "Store", logoUrl: null },
});
const entry = (id: string): VisualEntry => ({
  productId: id,
  imageId: id,
  sourceHash: imageSourceHash(`https://example.test/${id}.jpg`),
  contentHash: "a".repeat(64),
  vector,
});

test("all ranked IDs undergo current publication validation; stale first 1,000 never crowd out valid products", async () => {
  const entries = Array.from({ length: 1200 }, (_, i) =>
    entry(String(i).padStart(4, "0")),
  );
  const valid = product("1199");
  const search = createCatalogImageSearcher({
    index: async () => buildVisualSnapshot(entries, 1200, 0),
    encode: async () => vector,
    load: async (ids) => {
      assert.equal(ids.length, 1200);
      return [valid];
    },
    project: async () => [{ ...valid, discounts: [] }],
  });
  const result = await search(Buffer.from("image"), {
    ...defaultVisualSearchOptions,
    responseVersion: 2,
  });
  assert.deepEqual(result.productIds, ["1199"]);
  assert.deepEqual(
    result.products?.map((p) => p.id),
    ["1199"],
  );
});

test("final publication or image changes remove candidates; no fallback to cached GET", async () => {
  const visible = product("p");
  for (const projected of [
    [],
    [{ ...visible, images: [{ id: "p", url: "new-image" }], discounts: [] }],
  ]) {
    const search = createCatalogImageSearcher({
      index: async () => buildVisualSnapshot([entry("p")], 1, 0),
      encode: async () => vector,
      load: async () => [visible],
      project: async () => projected,
    });
    const result = await search(Buffer.from("image"), {
      ...defaultVisualSearchOptions,
      responseVersion: 2,
    });
    assert.deepEqual(result.productIds, []);
    assert.deepEqual(result.products, []);
  }
});
