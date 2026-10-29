import assert from "node:assert/strict";
import test from "node:test";
import {
  parseViewerPhone,
  parseViewerReportQuery,
} from "./warehouse-viewer.policy";
import { stockInvoiceCost } from "./warehouse-sales-cost";
import { Prisma } from "@mgl/database";

test("viewer phones normalize country code without accepting arbitrary identifiers", () => {
  for (const phone of ["99112233", "+976 9911-2233", "97699112233"])
    assert.equal(parseViewerPhone(phone), "99112233");
  for (const phone of [null, {}, "99112233abc", "123", "991122334", ""])
    assert.throws(() => parseViewerPhone(phone));
});
test("viewer filters enforce real Ulaanbaatar dates, order, and bounded page numbers", () => {
  const filter = parseViewerReportQuery({
    from: "2026-10-29",
    to: "2026-10-29",
    salesPage: "2",
  });
  assert.equal(filter.from?.toISOString(), "2026-10-28T16:00:00.000Z");
  assert.equal(filter.to?.toISOString(), "2026-10-29T15:59:59.999Z");
  assert.equal(filter.salesPage, 2);
  for (const query of [
    { from: "2026-02-30" },
    { from: "2026-10-30", to: "2026-10-29" },
    { salesPage: "0" },
    { productPage: "1000000" },
    { from: ["2026-10-29"] },
  ])
    assert.throws(() => parseViewerReportQuery(query));
});
test("cost snapshots preserve zero, decimal precision, kg scale and unknown costs", () => {
  const products = new Map([
    ["piece", { costPrice: new Prisma.Decimal("0.10"), unit: "ш" }],
    ["weight", { costPrice: new Prisma.Decimal("10000"), unit: "kg" }],
    ["free", { costPrice: new Prisma.Decimal(0), unit: null }],
    ["unknown", { costPrice: null, unit: null }],
  ]);
  assert.equal(
    stockInvoiceCost(
      [
        { productId: "piece", quantity: 3 },
        { productId: "weight", quantity: 1250 },
      ],
      (id) => products.get(id),
    )?.toString(),
    "12500.3",
  );
  assert.equal(
    stockInvoiceCost([{ productId: "free", quantity: 10 }], (id) =>
      products.get(id),
    )?.toString(),
    "0",
  );
  assert.equal(
    stockInvoiceCost([{ productId: "unknown", quantity: 1 }], (id) =>
      products.get(id),
    ),
    null,
  );
  assert.equal(
    stockInvoiceCost([{ productId: "missing", quantity: 1 }], (id) =>
      products.get(id),
    ),
    null,
  );
});
