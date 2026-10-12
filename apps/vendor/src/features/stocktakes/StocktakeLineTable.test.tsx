import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StocktakeLineTable } from "./StocktakeLineTable";

test("count and reason are editable directly in table cells without extra forms", () => {
  const html = renderToStaticMarkup(<StocktakeLineTable
    filtered={[{ id: "line", productId: "product", name: "Алим", barcode: null, barcodeAliases: [], unit: "kg", expected: 5250, counted: null, note: "", countedAt: null, countedById: null }]}
    filter="all" changedIds={new Set()} currentPage={0} editable selectedId="line"
    onFilter={() => {}} onPage={() => {}} onEdit={() => {}}
  />);
  assert.match(html, /aria-label="Алим бодит тоо"/);
  assert.match(html, /aria-label="Алим шалтгаан"/);
  assert.match(html, /inputMode="decimal"/);
  assert.doesNotMatch(html, /<dialog|<form|colSpan|aria-modal|backdrop/);
});
