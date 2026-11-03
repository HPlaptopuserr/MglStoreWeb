import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@mgl/database";
import {
  closureDate,
  expectedNet,
  parsePaymentSearch,
  paymentSearchWhere,
  PaymentSearchInputError,
} from "./payment-search";

const settlement = (extra: Record<string, unknown> = {}) =>
  parsePaymentSearch({
    mode: "settlement",
    reference: "ATMV51WQJ30 2026.08.31 QR ХААЛТ / Mongol JDB",
    netAmount: "774601.72",
    ...extra,
  });

test("closure uses the embedded local date, not next-day bank posting date", () => {
  const input = settlement();
  assert.equal(closureDate("2026.08.31 ordinary invoice"), null);
  assert.equal(input.date, "2026-08-31");
  const where = paymentSearchWhere(input);
  assert.deepEqual(where.paidAt, {
    gte: new Date("2026-08-30T16:00:00Z"),
    lt: new Date("2026-08-31T16:00:00Z"),
  });
  assert.equal(where.status, "PAID");
  assert.equal(where.method, "QPAY");
});

test("1% plus an explicit 200 fee matches the supplied settlement exactly", () => {
  const input = settlement({ transferFee: "200" });
  assert.equal(expectedNet(new Prisma.Decimal("782628"), input), "774601.72");
  const range = paymentSearchWhere(input).amount as Prisma.DecimalFilter;
  assert(new Prisma.Decimal("782628").gte(String(range.gte)));
  assert(new Prisma.Decimal("782628").lt(String(range.lt)));
});

test("unknown transfer fees are never silently assumed", () => {
  assert.equal(
    expectedNet(new Prisma.Decimal("782628"), settlement()),
    "774801.72",
  );
  const range = paymentSearchWhere(settlement()).amount as Prisma.DecimalFilter;
  assert(new Prisma.Decimal("782628").gte(String(range.lt)));
});

test("decimal rounding includes the lower half-cent boundary and excludes the upper", () => {
  const input = settlement({
    netAmount: "99.00",
    date: "2026-08-31",
    feePercent: "0.5",
  });
  const range = paymentSearchWhere(input).amount as Prisma.DecimalFilter;
  const lower = new Prisma.Decimal(String(range.gte));
  const upper = new Prisma.Decimal(String(range.lt));
  assert.equal(expectedNet(lower, input), "99.00");
  assert.equal(expectedNet(upper, input), "99.01");
});

test("reference search is literal and preserves the deleted-order scope", () => {
  const input = parsePaymentSearch({ reference: "ORD-20260831-061552" });
  assert.deepEqual(paymentSearchWhere(input), {
    order: { deletedAt: null },
    OR: [
      { providerRef: { contains: input.reference, mode: "insensitive" } },
      {
        order: {
          orderNumber: { contains: input.reference, mode: "insensitive" },
        },
      },
    ],
  });
  assert.equal(expectedNet(new Prisma.Decimal(100), input), null);
});

test("rejects invalid or unbounded requests and closure codes presented as invoice references", () => {
  for (const query of [
    {},
    { reference: "ab" },
    { reference: ["abc"] },
    { reference: "x".repeat(1001) },
    { reference: "2026.08.31 QR ХААЛТ" },
    { reference: "abc", page: "0" },
    { reference: "abc", page: "10000" },
    { reference: "abc", mode: "other" },
  ])
    assert.throws(() => parsePaymentSearch(query), PaymentSearchInputError);
  for (const extra of [
    { date: "2026-02-30" },
    { date: "2026-13-01" },
    { feePercent: "100" },
    { feePercent: "-1" },
    { transferFee: "-200" },
    { netAmount: "1e6" },
    { netAmount: "0" },
    { netAmount: "NaN" },
    { netAmount: "10.001" },
    { reference: "code only", date: "" },
  ])
    assert.throws(() => settlement(extra), PaymentSearchInputError);
});
