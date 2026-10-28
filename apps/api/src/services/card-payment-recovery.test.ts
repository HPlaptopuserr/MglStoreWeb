import assert from "node:assert/strict";
import test from "node:test";
import { assertMinuRecoveryPaid } from "./card-payment-recovery";
import { parseMinuAgentTransactionResponse } from "./minu-pos-agent";

test("recovery requires both an approved terminal result and a bank RRN for the requested invoice", () => {
  const invoice = "original-invoice";
  for (const entity of [
    { invoice, status: "000", rrn: null },
    { invoice, status: "10", rrn: null, error: "true" },
    { invoice, status: "FAILED", rrn: "unexpected" },
    { invoice: "another-invoice", status: "000", rrn: "wrong-rrn" },
  ]) {
    assert.throws(() =>
      assertMinuRecoveryPaid(
        parseMinuAgentTransactionResponse({ status: "000", entity }),
        invoice,
      ),
    );
  }
  assert.equal(
    assertMinuRecoveryPaid(
      parseMinuAgentTransactionResponse({
        status: "000",
        entity: { invoice, status: "000", rrn: "123456789012", error: "false" },
      }),
      invoice,
    ),
    "123456789012",
  );
});
