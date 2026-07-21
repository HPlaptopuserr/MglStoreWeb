import assert from "node:assert/strict";
import test from "node:test";
import { PaymentMethod, StockRequestStatus } from "@mgl/database";
import {
  canPayApprovedStockRequest,
  isPaymentMethod,
  validatePaymentConfirmation,
} from "./stock-payment.policy";

test("stock payment opens only after approval", () => {
  assert.equal(canPayApprovedStockRequest(StockRequestStatus.PENDING), false);
  assert.equal(canPayApprovedStockRequest(StockRequestStatus.APPROVED), true);
  assert.equal(canPayApprovedStockRequest(StockRequestStatus.PROCESSING), true);
  assert.equal(canPayApprovedStockRequest(StockRequestStatus.REJECTED), false);
});

test("payment method accepts only database enum values", () => {
  assert.equal(isPaymentMethod(PaymentMethod.QPAY), true);
  assert.equal(isPaymentMethod("NOT_A_METHOD"), false);
  assert.equal(isPaymentMethod(null), false);
});

test("payment confirmation preserves monotonic paid totals", () => {
  assert.deepEqual(
    validatePaymentConfirmation({
      paidAmount: 700,
      currentPaidAmount: 500,
      totalAmount: 1000,
    }),
    { ok: true, paidAmount: 700, fullyPaid: false },
  );
  assert.equal(
    validatePaymentConfirmation({
      paidAmount: 400,
      currentPaidAmount: 500,
      totalAmount: 1000,
    }).ok,
    false,
  );
});

test("payment becomes fully paid only at the original total", () => {
  assert.deepEqual(
    validatePaymentConfirmation({
      paidAmount: undefined,
      currentPaidAmount: 0,
      totalAmount: "3500000",
    }),
    { ok: true, paidAmount: 3500000, fullyPaid: true },
  );
});
