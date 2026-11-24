import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CreditLineAmount } from "./CreditLineAmount";
import type { PosCreditListLine } from "../types/credit-repayment";

const line = (lineTotal: number): PosCreditListLine => ({
  id: "line", productId: "product", productName: "Product", productSku: null,
  qty: 2, unitPrice: 10000, taxAmount: 0, discount: 1000,
  measureUnit: null, lineTotal,
});

test("71 product rows show their own amounts and an explicit receipt repayment button", () => {
  const amounts = Array.from({ length: 71 }, (_, i) => 19000 + i * 100);
  const html = amounts.map(amount => renderToStaticMarkup(<CreditLineAmount line={line(amount)} onRepay={() => {}} />));
  assert.match(html[0]!, /19,000/);
  assert.match(html[1]!, /19,100/);
  assert.match(html[70]!, /26,000/);
  for (const row of html) {
    assert.match(row, /Барааны дүн/);
    assert.match(row, /<button[^>]*>Баримтын зээл төлөх<\/button>/);
    assert.doesNotMatch(row, /1,041,350/);
  }
});
