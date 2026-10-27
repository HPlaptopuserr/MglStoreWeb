import assert from "node:assert/strict";
import { test } from "node:test";
import { monthlyPaymentsReport, paymentMonthStart } from "./monthly-payments";

test("cash month uses Ulaanbaatar payment time, independently of the due month", () => {
  const report = monthlyPaymentsReport(
    2026,
    [
      {
        amount: "100.25",
        status: "PAID",
        dueDate: new Date("2026-10-05T00:00:00Z"),
      },
      {
        amount: "200",
        status: "PENDING",
        dueDate: new Date("2026-10-15T00:00:00Z"),
      },
      {
        amount: "900",
        status: "CANCELLED",
        dueDate: new Date("2026-10-20T00:00:00Z"),
      },
    ],
    [
      {
        amount: "100.25",
        status: "PAID",
        paidAt: new Date("2026-09-30T15:59:59Z"),
      },
      {
        amount: "50",
        status: "PAID",
        paidAt: new Date("2026-09-30T16:00:00Z"),
      },
      {
        amount: "40",
        status: "PENDING",
        paidAt: new Date("2026-10-10T00:00:00Z"),
      },
      { amount: "25", status: "PAID", paidAt: null },
    ],
  );
  assert.equal(report.months[8].received, "100.25");
  assert.equal(report.months[9].received, "50");
  assert.equal(report.months[9].expected, "300.25");
  assert.equal(report.months[9].settled, "100.25");
  assert.equal(report.months[9].outstanding, "200");
  assert.equal(report.months[9].paymentCount, 1);
  assert.deepEqual(report.undated, { count: 1, amount: "25" });
});

test("January compares to last December without counting it in annual totals; money remains exact", () => {
  const report = monthlyPaymentsReport(
    2026,
    [],
    [
      {
        amount: "500",
        status: "PAID",
        paidAt: new Date("2025-12-31T15:59:59Z"),
      },
      {
        amount: "0.1",
        status: "PAID",
        paidAt: new Date("2025-12-31T16:00:00Z"),
      },
      {
        amount: "0.2",
        status: "PAID",
        paidAt: new Date("2026-01-01T00:00:00Z"),
      },
      {
        amount: "100",
        status: "PAID",
        paidAt: new Date("2026-12-31T16:00:00Z"),
      },
    ],
  );
  assert.equal(report.previousDecember.received, "500");
  assert.equal(report.previousDecember.year, 2025);
  assert.equal(report.months[0].received, "0.3");
  assert.equal(report.totals.received, "0.3");
  assert.equal(report.months.length, 12);
  assert.equal(
    paymentMonthStart(2026, 1).toISOString(),
    "2025-12-31T16:00:00.000Z",
  );
});

test("empty reports include twelve zero months and no invented cash receipts", () => {
  const report = monthlyPaymentsReport(
    2026,
    [
      {
        amount: "100",
        status: "PAID",
        dueDate: new Date("2026-08-01T00:00:00Z"),
      },
    ],
    [],
  );
  assert.equal(report.months[7].expected, "100");
  assert.equal(report.months[7].received, "0");
  assert.equal(report.months[7].outstanding, "0");
  assert.equal(report.totals.received, "0");
});
