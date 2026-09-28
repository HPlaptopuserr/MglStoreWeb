import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCashPayment,
  parseCashReceivedAmount,
  normalizeCashPayment,
  readCashPayment,
  summarizeCashPayments,
} from "@mgl/types";
import { summarizeShiftSales } from "./shift-accounting";

for (const [label, received, payable, applied, change, remaining] of [
  ["overpayment", 20000, 5500, 5500, 14500, 0],
  ["exact", 5500, 5500, 5500, 0, 0],
  ["partial", 3000, 5500, 3000, 0, 2500],
  ["decimal minor units", 0.3, 0.1, 0.1, 0.2, 0],
] as const) {
  test(label, () =>
    assert.deepEqual(calculateCashPayment(received, payable), {
      amount: applied,
      cash: { receivedAmount: received, changeAmount: change },
      remaining,
    }),
  );
}
for (const value of [-1, 0, NaN, Infinity, 1000000000, 0.001]) {
  test(`reject invalid tender ${value}`, () =>
    assert.throws(() => calculateCashPayment(value, 5500)));
}
test("server recomputes untrusted change", () => {
  assert.deepEqual(
    normalizeCashPayment("CASH", 5500, {
      receivedAmount: 20000,
      changeAmount: 0,
    }),
    { receivedAmount: 20000, changeAmount: 14500 },
  );
});
test("server rejects insufficient and malformed tender", () => {
  for (const input of [
    null,
    0,
    {},
    { receivedAmount: "20000" },
    { receivedAmount: 3000 },
  ]) {
    assert.throws(() => normalizeCashPayment("CASH", 5500, input));
  }
});
test("metadata is cash-only; legacy requests remain supported", () => {
  for (const method of ["CARD", "QPAY", "CREDIT"]) {
    assert.throws(() =>
      normalizeCashPayment(method, 5500, { receivedAmount: 20000 }),
    );
    assert.equal(normalizeCashPayment(method, 5500, undefined), undefined);
  }
  assert.equal(normalizeCashPayment("CASH", 5500, undefined), undefined);
});
test("history round trip preserves server cash details", () => {
  const cash = normalizeCashPayment("CASH", 5500, { receivedAmount: 20000 });
  const stored: unknown = JSON.parse(JSON.stringify(cash));
  assert.deepEqual(readCashPayment("CASH", 5500, stored), cash);
  assert.equal(
    readCashPayment("CASH", 5500, { receivedAmount: -1 }),
    undefined,
  );
});
test("mixed sale and multiple cash rows retain net drawer revenue", () => {
  const paymentBreakdown = [
    { method: "CARD", amount: 10000 },
    { method: "CASH", ...calculateCashPayment(3000, 5500) },
    { method: "CASH", ...calculateCashPayment(20000, 2500) },
  ];
  const summary = summarizeShiftSales([
    { grandTotal: 15500, paymentMethod: "MIXED", paymentBreakdown },
  ]);
  assert.equal(summary.cashSales, 5500);
  assert.equal(summary.cardSales, 10000);
  assert.deepEqual(summarizeCashPayments(paymentBreakdown), {
    receivedAmount: 23000,
    changeAmount: 17500,
  });
});
test("legacy cash rows are not inferred as exact tender", () => {
  assert.equal(
    summarizeCashPayments([{ method: "CASH", amount: 5500 }]),
    undefined,
  );
});

test("cash entry accepts decimal money only", () => {
  assert.equal(parseCashReceivedAmount("20000"), 20000);
  assert.equal(parseCashReceivedAmount("0.25"), 0.25);
  for (const input of ["", "-1", "1e3", "0x20", "5abc", "1.234", "Infinity"]) {
    assert.throws(() => parseCashReceivedAmount(input));
  }
});
