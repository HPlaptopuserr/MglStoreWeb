import assert from "node:assert/strict";
import test from "node:test";
import { productImageOrderBy, toOrderedProductImages } from "./product-images";

test("toOrderedProductImages preserves the vendor-selected primary image", () => {
  assert.deepEqual(
    toOrderedProductImages(["main.jpg", "side.jpg", "back.jpg"]),
    [
      { url: "main.jpg", sortOrder: 0 },
      { url: "side.jpg", sortOrder: 1 },
      { url: "back.jpg", sortOrder: 2 },
    ],
  );
});

test("productImageOrderBy uses id only as a deterministic tie-breaker", () => {
  assert.deepEqual(productImageOrderBy(), [
    { sortOrder: "asc" },
    { id: "asc" },
  ]);
});
