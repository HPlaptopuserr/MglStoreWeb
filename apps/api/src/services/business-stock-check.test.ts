import assert from "node:assert/strict";
import test from "node:test";
import {
  parseStockCheckInput,
  StockCheckError,
} from "./business-stock-check.service";
import { readStockCheckAdjustment } from "./stock-check-audit";
const valid = {
  organizationId: "org",
  expectedStock: 10,
  expectedPrice: 4500,
  expectedUnit: "pcs",
  stock: 8,
  price: 4600,
  note: "Бодит тооллого",
};
test("stock check rejects untrusted quantities, invalid money and missing reasons", () => {
  for (const input of [
    null,
    {},
    { ...valid, stock: -1 },
    { ...valid, stock: "8" },
    { ...valid, price: Infinity },
    { ...valid, price: 1.001 },
    { ...valid, note: "" },
    { ...valid, expectedStock: undefined },
  ])
    assert.throws(() => parseStockCheckInput(input), StockCheckError);
  assert.deepEqual(
    parseStockCheckInput({
      ...valid,
      actorId: "spoofed",
      note: " Бодит тооллого ",
    }),
    valid,
  );
});
test("history parses only versioned numeric audit snapshots", () => {
  const meta = {
    version: 1,
    beforeStock: 10,
    afterStock: 8,
    beforePrice: 4500,
    afterPrice: 4600,
    unit: "pcs",
  };
  assert.deepEqual(readStockCheckAdjustment(meta), {
    beforeStock: 10,
    afterStock: 8,
    beforePrice: 4500,
    afterPrice: 4600,
    unit: "pcs",
  });
  for (const invalid of [
    null,
    {},
    { ...meta, version: 2 },
    { ...meta, beforeStock: "10" },
    { ...meta, afterPrice: Infinity },
  ])
    assert.equal(readStockCheckAdjustment(invalid), null);
});
