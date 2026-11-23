import assert from "node:assert/strict";
import test from "node:test";
import type { CreditPaymentHistoryItem } from "../api/credit-payment-history";
import { creditPaymentHistoryReceipt } from "./credit-payment-history-receipt";
const payment: CreditPaymentHistoryItem = {
  id: "record",
  createdAt: "2026-11-23T03:00:00Z",
  requestId: "request",
  paidAmount: 30000,
  paymentMethod: "QPAY",
  shiftId: "old-shift",
  invoiceId: "invoice",
  attemptId: null,
  remainingDue: 70000,
  borrowerNames: ["Registered borrower"],
  allocations: [
    { creditSaleId: "old-debt", amount: 10000 },
    { creditSaleId: "next-debt", amount: 20000 },
  ],
  ebarimt: {
    status: "SUCCESS",
    billId: "existing-bill",
    qrData: "existing-qr",
    receiptType: "B2C",
    payload: { totalAmount: 30000, totalVAT: 2727.27 },
  },
};
test("reprint uses the existing installment amounts and fiscal identity without any provider call", () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Reprint must never contact a provider");
  };
  try {
    const receipt = creditPaymentHistoryReceipt(payment);
    assert.equal(receipt.grandTotal, 30000);
    assert.equal(
      receipt.lines.reduce((sum, line) => sum + line.lineTotal, 0),
      30000,
    );
    assert.equal(receipt.ebarimt?.billId, "existing-bill");
    assert.equal(receipt.paymentBreakdown?.[0]?.invoiceId, "invoice");
    assert.equal(receipt.paymentBreakdown?.[0]?.method, "QR");
    assert.equal(receipt.createdAt, payment.createdAt);
    assert.equal(receipt.shiftId, "old-shift");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("legacy ledger without allocations still prints exactly the recorded payment", () => {
  const receipt = creditPaymentHistoryReceipt({
    ...payment,
    allocations: [],
    ebarimt: null,
  });
  assert.equal(receipt.lines.length, 1);
  assert.equal(receipt.lines[0]?.lineTotal, 30000);
  assert.equal(receipt.ebarimt, null);
});
