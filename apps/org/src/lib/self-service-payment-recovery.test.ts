import assert from "node:assert/strict";
import test from "node:test";
import { parseSelfServicePendingPayment } from "./self-service-payment-recovery";

test("deferred self-service snapshots retain the original ticket and terminal reference across reload", () => {
  const payment = { version: 1, organizationId: "org", registerId: "register", orderMode: "TO_GO",
    paymentMethod: "CARD", savedAt: "2026-11-10T00:00:00+08:00", checkout: {
      clientSaleId: "original-order", ticket: { id: "ticket", ticketNo: "311" }, shiftId: "original-shift",
      total: 19000, packagingFee: 0, ebarimtBuyer: { type: "B2C" },
      lines: [{ product: { id: "coffee", price: 19000 }, qty: 1 }],
      cardAttempt: { attemptId: "original-bank-request", amount: 19000, status: "PENDING" },
    } };
  for (const status of ["PENDING", "APPROVED", "DECLINED"]) {
    const result = parseSelfServicePendingPayment(JSON.parse(JSON.stringify({ ...payment,
      checkout: { ...payment.checkout, cardAttempt: { ...payment.checkout.cardAttempt, status } } })));
    assert.equal(result?.checkout.clientSaleId, "original-order");
    assert.equal(result?.checkout.ticket.id, "ticket");
    assert.equal(result?.checkout.shiftId, "original-shift");
    assert.equal(result?.paymentMethod === "CARD" && result.checkout.cardAttempt.attemptId, "original-bank-request");
  }
  assert.equal(parseSelfServicePendingPayment({ ...payment, checkout: { ...payment.checkout, cardAttempt: {} } }), null);
  assert.equal(parseSelfServicePendingPayment({ ...payment, checkout: { ...payment.checkout, lines: [] } }), null);
});
