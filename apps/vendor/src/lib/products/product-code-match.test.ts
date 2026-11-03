import assert from "node:assert/strict";
import test from "node:test";
import { findProductCodeConflict, matchingProductCodes } from "./product-code-match";
import { analyzeProductDraft } from "../ai-assistant/product-data-assistant";

test("editing excludes the current product and names never imply a code match", () => {
  const product = { id: "current", name: "Аляска шоколад", sku: "LYS-MGL-004", barcode: "8654000555545" };
  assert.equal(findProductCodeConflict(product, [product], product.id), undefined);
  const result = analyzeProductDraft({ draft: product, products: [product], categories: [], editingId: product.id });
  assert.deepEqual(result.duplicateSuggestions, []);
});

test("SKU-only, barcode-only and both conflicts remain distinguishable", () => {
  const product = { id: "other", sku: "SKU-1", barcode: "00123" };
  assert.deepEqual(matchingProductCodes({ sku: " sku-1 ", barcode: "123" }, product), ["sku"]);
  assert.deepEqual(matchingProductCodes({ sku: "SKU-2", barcode: "00123" }, product), ["barcode"]);
  assert.deepEqual(findProductCodeConflict(product, [product], "current")?.fields, ["sku", "barcode"]);
  assert.deepEqual(matchingProductCodes({ sku: "", barcode: " " }, { sku: null, barcode: null }), []);
});

test("code punctuation is preserved and similar names are not barcode conflicts", () => {
  const draft = { name: "Аляска шоколад", sku: "AB-12", barcode: "86-54" };
  const other = { id: "other", name: draft.name, sku: "AB/12", barcode: "86/54" };
  assert.deepEqual(matchingProductCodes(draft, other), []);
  const result = analyzeProductDraft({ draft, products: [other], categories: [], editingId: "current" });
  assert.equal(result.duplicateSuggestions[0]?.matchType, "name");
  assert.ok(!result.summary.includes("Давхардал"));
  assert.ok(result.actionPlan.every(action => !action.includes("Давхцсан код")));
});

test("real barcode conflicts take priority over similar names and remain warnings", () => {
  const draft = { name: "Аляска шоколад", barcode: "8654000555545" };
  const products = [0, 1, 2, 3].map(id => ({ id: String(id), name: draft.name, barcode: `other-${id}` }));
  products.push({ id: "conflict", name: "Өөр бараа", barcode: draft.barcode });
  const result = analyzeProductDraft({ draft, products, categories: [], editingId: "current" });
  assert.equal(result.duplicateSuggestions[0]?.id, "conflict");
  assert.equal(result.duplicateSuggestions[0]?.matchType, "code");
  assert.match(result.summary, /Давхардал/);
});
