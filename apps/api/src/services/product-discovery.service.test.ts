import assert from "node:assert/strict";
import test from "node:test";
import { createProductSearchScorer, getProductSearchPhrases } from "@mgl/types";
import {
  buildProductSearchWhere,
  scoreProductForSearch,
} from "./product-discovery.service";

const latte = {
  id: "latte",
  name: "Mgl Cafe Latte",
  sku: "MGL-LATTE-01",
  barcode: "8650000123456",
  classificationCode: "6331000",
  taxProductCode: "1234567",
};

test("storefront and POS search match full names, individual words, case and extra whitespace", () => {
  for (const query of [
    "Mgl Cafe Latte",
    "mgl cafe latte",
    "cafe",
    "latte",
    "  MGL   CAFE LATTE  ",
    "latte cafe",
  ]) {
    assert.ok(createProductSearchScorer(query)(latte) > 0, query);
    assert.equal(
      createProductSearchScorer(query)(latte),
      scoreProductForSearch(latte, query),
    );
  }
  assert.equal(createProductSearchScorer("unrelated item")(latte), 0);
});

test("exact product names rank before products matching only one word", () => {
  const score = createProductSearchScorer("mgl cafe latte");
  assert.ok(score(latte) > score({ id: "other", name: "Mgl Cafe Americano" }));
});

test("SKU, barcode and tax codes support partial matches including a single digit", () => {
  for (const query of [
    "8650000123456",
    "000012",
    "MGL-LATTE",
    "6331000",
    "1234567",
    "8",
  ]) {
    assert.ok(createProductSearchScorer(query)(latte) > 0, query);
  }
  const clauses = buildProductSearchWhere("6331000");
  assert.ok(clauses.some((clause) => "classificationCode" in clause));
  assert.ok(clauses.some((clause) => "taxProductCode" in clause));
});

test("the storefront's Mongolian transliteration is available to POS", () => {
  assert.ok(createProductSearchScorer("suu")({ id: "milk", name: "Сүү" }) > 0);
  assert.ok(getProductSearchPhrases("suu").includes("сүү"));
  assert.ok(
    getProductSearchPhrases("Mgl   Cafe Latte").includes("mgl cafe latte"),
  );
});
