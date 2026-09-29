import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePublicProduct, matchesPreviewFilters } from "./public-catalog";
import { defaultVisualSearchOptions } from "../../services/visual-search/visual-search-options";

const product = {
  id: "public-product",
  name: "Бодит бараа",
  price: "12500.50",
  stock: 0,
  unit: "ширхэг",
  supplyType: "CHINA_PREORDER",
  costPrice: "secret-cost",
  supplier: { private: true },
  images: [
    { id: "image", url: "https://example.test/image.jpg", metadata: "private" },
  ],
  organization: { id: "org", name: "Дэлгүүр", bankAccount: "private" },
  businessCategory: { id: "cat", name: "Гутал", slug: "shoes", parent: null },
  discounts: [
    { percent: 10, validUntil: "2099-01-01T00:00:00Z" },
    { percent: 90, validUntil: "2000-01-01T00:00:00Z" },
  ],
};

test("public projection excludes internal fields and preserves live values", () => {
  const parsed = parsePublicProduct(product);
  const json = JSON.stringify(parsed);
  for (const internal of [
    "costPrice",
    "supplier",
    "bankAccount",
    "metadata",
    "private",
  ])
    assert.equal(json.includes(internal), false);
  assert.equal(Number(parsed.price), 12500.5);
  assert.equal(parsed.stock, 0);
  assert.equal(parsed.discounts.length, 1);
  assert.equal(parsed.discounts[0]?.percent, 10);
  assert.equal(parsed.businessCategory?.slug, "shoes");
});

test("preview uses storefront orderability and base-price range without scaling stock", () => {
  const parsed = parsePublicProduct(product);
  assert.equal(
    matchesPreviewFilters(parsed, {
      ...defaultVisualSearchOptions,
      inStock: true,
    }),
    true,
  );
  assert.equal(
    matchesPreviewFilters(
      { ...parsed, supplyType: "IN_STOCK" },
      { ...defaultVisualSearchOptions, inStock: true },
    ),
    false,
  );
  assert.equal(
    matchesPreviewFilters(parsed, {
      ...defaultVisualSearchOptions,
      priceMax: 12500,
    }),
    false,
  );
  assert.equal(
    matchesPreviewFilters(parsed, {
      ...defaultVisualSearchOptions,
      priceMin: 12500.5,
    }),
    true,
  );
});

test("malformed upstream product fails instead of creating fabricated data", () => {
  for (const invalid of [
    { ...product, price: "invalid" },
    { ...product, supplyType: "unknown" },
    { ...product, images: null },
  ])
    assert.throws(() => parsePublicProduct(invalid));
});
