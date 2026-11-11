import * as React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ReceiptLinesTable } from "../../../../../packages/ui/src/organisms/goods-receipt/ReceiptLinesTable";
import type { ReceiptLine } from "./receipt-types";

// The shared UI package uses the classic JSX transform in the Node test runner.
Object.assign(globalThis, { React });

const line: ReceiptLine = {
  id: "line-1",
  product: { id: "milk", name: "Сүү", stock: 0, unit: "pcs", price: 4500 },
  quantity: 1,
  unitCost: "3000",
  salePrice: "4500",
  manualPrice: true,
  batchNumber: "",
  expiryDate: "",
};
const noop = () => {};
function render(unit: "pcs" | "kg", readOnly: boolean) {
  return renderToStaticMarkup(
    <ReceiptLinesTable
      lines={[{ ...line, product: { ...line.product, unit } }]}
      total={3000}
      salePriceReadOnly={readOnly}
      onQuantity={noop}
      onField={noop}
      onRemove={noop}
      onAutomaticPrice={noop}
    />,
  );
}

test("cashiers see the registered piece sale price without price editing controls", () => {
  const html = render("pcs", true);
  assert.match(html, /Зарах үнэ/);
  assert.match(html, /readOnly=""[^>]*value="4500"/);
  assert.doesNotMatch(html, /Автоматаар бодох/);
});

test("cashiers see the weighted sale price and owners retain editing", () => {
  const cashier = render("kg", true);
  assert.match(cashier, /readOnly=""[^>]*value="4500"/);
  assert.doesNotMatch(cashier, /Автоматаар бодох/);
  const owner = render("pcs", false);
  assert.match(owner, /Автоматаар бодох/);
  assert.doesNotMatch(owner, /readOnly/i);
});
