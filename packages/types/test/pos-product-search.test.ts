import assert from "node:assert/strict";
import test from "node:test";
import {
  createPosProductSearchScorer,
  type SearchableProduct,
} from "../src/domain/product-discovery";

const cucumber: SearchableProduct = {
  id: "cucumber",
  name: "Nogoon ogurtsi",
  sku: "nogoon ogurtsi",
  barcode: "12121212",
};
const greenProducts: SearchableProduct[] = [
  { id: "mentos", name: "Mentos ногоон 13g" },
  { id: "nivea", name: "NIVEA 40ш НОГООН" },
  { id: "silk", name: "SILK НОГООН" },
  { id: "soup", name: "Бэлэн хоол ясны шөл ногоон жижиг" },
];
const find = (query: string, products: SearchableProduct[]) => {
  const score = createPosProductSearchScorer(query);
  return products
    .map((product) => ({ product, score: score(product) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.product.id);
};

test("the full cucumber lookup excludes products that match only green", () => {
  assert.deepEqual(find("nogoon ogurtsi", [...greenProducts, cucumber]), [
    "cucumber",
  ]);
  assert.deepEqual(
    find("nogoon ogurtsi", greenProducts),
    [],
    "an unavailable exact product must not be replaced with unrelated products",
  );
  assert.deepEqual(find("ogurtsi nogoon", [...greenProducts, cucumber]), [
    "cucumber",
  ]);
});
test("single-word Latin and Cyrillic green searches remain supported", () => {
  assert.equal(find("nogoon", greenProducts).length, greenProducts.length);
  assert.equal(find("ногоон", greenProducts).length, greenProducts.length);
});
test("mixed-script multiword queries require all words", () => {
  const products = [
    ...greenProducts,
    { id: "cyrillic", name: "Ногоон огурци" },
  ];
  assert.deepEqual(find("nogoon огурци", products), ["cyrillic"]);
  assert.deepEqual(find("ногоон ogurtsi", products), ["cyrillic"]);
});
test("exact SKU and barcode aliases rank ahead of name substrings", () => {
  const products: SearchableProduct[] = [
    { id: "name", name: "12121212 савлагаа" },
    cucumber,
    { id: "alias", name: "Өргөст хэмх", barcodeAliases: ["00123456"] },
  ];
  assert.equal(find("12121212", products)[0], "cucumber");
  assert.deepEqual(find("00123456", products), ["alias"]);
  assert.equal(
    find("nogoon ogurtsi", [greenProducts[0], cucumber])[0],
    "cucumber",
  );
});
test("quantity words, casing, whitespace and punctuation do not broaden a query", () => {
  assert.deepEqual(find("  NOGOoN   OGURTSI ", [...greenProducts, cucumber]), [
    "cucumber",
  ]);
  assert.deepEqual(find("nivea 40ш", greenProducts), ["nivea"]);
  assert.deepEqual(find("nivea 99ш", greenProducts), []);
  assert.deepEqual(find("---", greenProducts), []);
});
