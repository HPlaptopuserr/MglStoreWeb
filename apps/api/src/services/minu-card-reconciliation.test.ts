import assert from "node:assert/strict";
import test from "node:test";
import { Prisma, type CardPaymentAttempt } from "@prisma/client";
import { minuCardInvoice, minuCardStatusUpdate } from "./minu-card-reconciliation";
import { parseMinuAgentTransactionResponse } from "./minu-pos-agent";

function attempt(overrides: Partial<CardPaymentAttempt> = {}): CardPaymentAttempt {
  return {
    id: "attempt", registerId: "register", organizationId: "organization",
    initiatedById: "cashier", terminalId: "terminal", bridgeUrl: null,
    amount: new Prisma.Decimal(28500), status: "PENDING",
    transactionId: null, traceno: null, message: null,
    createdAt: new Date(), updatedAt: new Date(), consumedAt: null, saleReference: null,
    providerPayload: { provider: "MINU_AGENT", invoice: "MGL-original" },
    ...overrides,
  };
}

test("mgl-313 approval without an RRN automatically uses the original invoice", () => {
  const result = parseMinuAgentTransactionResponse({
    status: "000", entity: { invoice: "MGL-original", status: "000", error: "false", rrn: null },
  });
  const data = minuCardStatusUpdate(attempt(), result);
  assert.equal(data?.status, "APPROVED");
  assert.equal(data?.transactionId, "MGL-original");
  assert.equal(data?.traceno, null);
});

test("an invoice timeout remains checkable and API success alone cannot confirm payment", () => {
  const failed = attempt({ status: "FAILED", message: "fetch failed" });
  assert.equal(minuCardInvoice(failed), "MGL-original");
  const data = minuCardStatusUpdate(failed, parseMinuAgentTransactionResponse({
    status: "000", entity: { invoice: "MGL-original", status: null, error: "true" },
  }));
  assert.equal(data?.status, "PENDING");
  assert.equal(data?.transactionId, undefined);
});

test("another invoice cannot approve this basket and completed payments are immutable", () => {
  const result = parseMinuAgentTransactionResponse({
    status: "000", entity: { invoice: "different-invoice", status: "000", rrn: "rrn" },
  });
  assert.throws(() => minuCardStatusUpdate(attempt(), result), /нэхэмжлэх/);
  for (const row of [
    attempt({ status: "APPROVED" }), attempt({ status: "DECLINED" }),
    attempt({ consumedAt: new Date() }), attempt({ saleReference: "POS-existing" }),
    attempt({ providerPayload: { mode: "manual-card" } }),
    attempt({ providerPayload: { provider: "PUSH_ECR", invoice: "MGL-original" } }),
  ]) assert.equal(minuCardStatusUpdate(row, result), null);
});

test("an explicit terminal decline remains a decline", () => {
  const data = minuCardStatusUpdate(attempt(), parseMinuAgentTransactionResponse({
    status: "000", entity: { invoice: "MGL-original", status: "DECLINED", error: "DECLINED" },
  }));
  assert.equal(data?.status, "DECLINED");
});
