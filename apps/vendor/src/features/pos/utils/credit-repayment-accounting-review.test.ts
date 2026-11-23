import assert from "node:assert/strict";
import test from "node:test";
import type { PosCreditListItem } from "../types/credit-repayment";
import { creditRepaymentReceiptLines } from "./credit-repayment-amount";
import { isCreditRepaymentContext } from "./credit-repayment-context";

const credit = (id: string, createdAt: string): PosCreditListItem => ({
  id,
  createdAt,
  customerId: "customer",
  saleId: `sale-${id}`,
  receiptNo: id,
  status: "OPEN",
  targetType: "CUSTOMER",
  borrowerId: "borrower",
  borrowerName: "Test",
  borrowerPhone: "99112233",
  borrowerEmail: null,
  borrowerAddress: null,
  employeeId: null,
  employeeName: null,
  principalAmount: 100,
  monthlyInterestRate: 0,
  totalInterest: 0,
  totalDue: 100,
  termMonths: 1,
  dueDate: null,
  paidAt: null,
  paidAmount: null,
  paymentMethod: null,
  paymentNote: null,
  lines: [
    {
      id: `line-${id}`,
      productId: id,
      productName: id,
      productSku: null,
      qty: 1,
      unitPrice: 100,
      taxAmount: 0,
      discount: 0,
      measureUnit: null,
      lineTotal: 100,
    },
  ],
});

test("installment fiscal lines follow committed server allocations even when display dates sort differently", () => {
  const olderDisplay = credit("older-display", "2026-01-01T00:00:00Z");
  const newerDisplay = credit("newer-display", "2026-02-01T00:00:00Z");
  const result = creditRepaymentReceiptLines(
    {
      lines: [...olderDisplay.lines, ...newerDisplay.lines],
      credits: [olderDisplay, newerDisplay],
      repaymentAllocations: [
        { creditSaleId: newerDisplay.id, amount: 100 },
        { creditSaleId: olderDisplay.id, amount: 0.01 },
      ],
    },
    100.01,
  );
  assert.deepEqual(
    result.map((row) => [row.line.productId, row.amount]),
    [
      [olderDisplay.id, 0.01],
      [newerDisplay.id, 100],
    ],
  );
  assert.equal(
    result.reduce((sum, row) => sum + Math.round(row.amount * 100), 0),
    10001,
  );
});

test("recovered installment retains original shift and rejects malformed nested fiscal source", () => {
  const source = credit("credit", "2026-01-01T00:00:00Z");
  const context = {
    requestId: "original-request",
    shiftId: "original-shift",
    credit: { ...source, repaymentAmount: 0.01, credits: [source] },
  };
  assert.equal(
    isCreditRepaymentContext(JSON.parse(JSON.stringify(context))),
    true,
  );
  for (const malformed of [
    { ...source, lines: [] },
    { ...source, createdAt: "bad-date" },
    { ...source, id: "" },
  ]) {
    assert.equal(
      isCreditRepaymentContext({
        ...context,
        credit: { ...context.credit, credits: [malformed] },
      }),
      false,
    );
  }
});
