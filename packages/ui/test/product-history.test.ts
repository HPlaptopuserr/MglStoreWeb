import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductHistoryTable } from "../src/organisms/product-history/ProductHistoryDetails";
import type { HistoryEntry } from "../src/organisms/product-history/product-history.types";
const entry: HistoryEntry = {
  id: "log",
  date: "2026-10-23T00:00:00Z",
  quantity: 0.75,
  reason: "MANUAL_ADJUST",
  note: "Бодит тооллогын зөрүү",
  userName: "Зассан эзэн",
  userId: "actor",
  warehouse: "Дэлгүүр",
  source: null,
  document: "correction",
  referenceType: "BUSINESS_STOCK_CHECK",
  cancelled: false,
  adjustment: {
    beforeStock: 1.5,
    afterStock: 2.25,
    beforePrice: 4500,
    afterPrice: 4800,
    unit: "kg",
  },
};
test("web detail history displays actor, source, reason and both before/after values", () => {
  const html = renderToStaticMarkup(ProductHistoryTable({ entries: [entry] }));
  for (const text of [
    "Зассан эзэн",
    "MGL Business · Бараа тоолох",
    "Бодит тооллогын зөрүү",
    "Үлдэгдэл (кг)",
    "Худалдах үнэ",
    "1.5",
    "2.25",
    "4,500",
    "4,800",
    "→",
  ])
    assert.ok(html.includes(text), text);
});
test("price-only changes remain visible with zero inventory movement", () => {
  const html = renderToStaticMarkup(
    ProductHistoryTable({
      entries: [
        {
          ...entry,
          quantity: 0,
          adjustment: { ...entry.adjustment!, afterStock: 1.5 },
        },
      ],
    }),
  );
  assert.match(html, /Худалдах үнэ/);
  assert.doesNotMatch(html, /Үлдэгдэл \(кг\)/);
});
test("legacy and empty history remain supported", () => {
  assert.match(
    renderToStaticMarkup(
      ProductHistoryTable({ entries: [{ ...entry, adjustment: null }] }),
    ),
    /Зассан эзэн/,
  );
  assert.match(
    renderToStaticMarkup(ProductHistoryTable({ entries: [] })),
    /түүх бүртгэгдээгүй/,
  );
});
