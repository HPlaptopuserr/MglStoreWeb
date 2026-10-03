import assert from "node:assert/strict";
import test from "node:test";
import { calculateSaleFinancials } from "./sale-financials";
import {
  summarizeSalesFinancials,
  summarizeSoldProducts,
} from "./sold-product-summary";
import { createSalesHistoryDemo } from "./sales-history-demo";

const sample = () => {
  const [receipt] = createSalesHistoryDemo();
  const line = {
    ...receipt.lines[0],
    qty: 2,
    unitPrice: 100,
    lineTotal: 180,
    discount: 20,
    unitCost: 60,
    costTotal: 120,
  };
  return { ...receipt, lines: [line] };
};

test("discounted revenue, saved cost and both profit percentages use different denominators", () => {
  const financials = calculateSaleFinancials(sample().lines[0]);
  assert.equal(financials.cost, 120);
  assert.equal(financials.profit, 60);
  assert.equal(financials.sellingPrice, 90);
  assert.equal(financials.unitCost, 60);
  assert.ok(Math.abs((financials.margin || 0) - 100 / 3) < 0.0001);
  assert.equal(financials.markup, 50);
  assert.equal(financials.discount, 20);
});

test("snapshot total cost wins; saved unit cost is a fallback; missing, losses and zero costs stay explicit", () => {
  const line = sample().lines[0];
  assert.equal(calculateSaleFinancials({ ...line, costTotal: 130 }).cost, 130);
  assert.equal(calculateSaleFinancials({ ...line, costTotal: null }).cost, 120);
  assert.equal(
    calculateSaleFinancials({ ...line, costTotal: null, unitCost: null })
      .profit,
    null,
  );
  const loss = calculateSaleFinancials({ ...line, costTotal: 240 });
  assert.equal(loss.profit, -60);
  const free = calculateSaleFinancials({ ...line, lineTotal: 0 });
  assert.equal(free.profit, -120);
  assert.equal(free.margin, null);
  assert.equal(calculateSaleFinancials({ ...line, costTotal: 0 }).markup, null);
});

test("product totals use weighted prices and weighted margin, and partial costs never invent total profit", () => {
  const first = sample();
  const second = {
    ...first,
    id: "second",
    lines: [
      { ...first.lines[0], qty: 1, lineTotal: 150, costTotal: 80, discount: 0 },
    ],
  };
  const [row] = summarizeSoldProducts([first, second]);
  assert.equal(row.quantity, 3);
  assert.equal(row.cost, 200);
  assert.equal(row.profit, 130);
  assert.equal(row.unitCost, 200 / 3);
  assert.equal(row.sellingPrice, 110);
  assert.ok(Math.abs((row.margin || 0) - (130 / 330) * 100) < 0.0001);
  const [partial] = summarizeSoldProducts([
    first,
    {
      ...second,
      lines: [{ ...second.lines[0], costTotal: null, unitCost: null }],
    },
  ]);
  assert.equal(partial.cost, null);
  assert.equal(partial.profit, null);
  assert.equal(partial.margin, null);
  assert.equal(partial.missingCostCount, 1);
  const totals = summarizeSalesFinancials([partial]);
  assert.equal(totals.revenue, 330);
  assert.equal(totals.knownRevenue, 180);
  assert.equal(totals.knownCost, 120);
  assert.equal(totals.profit, 60);
});
