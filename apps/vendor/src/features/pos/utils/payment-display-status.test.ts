import assert from "node:assert/strict";
import test from "node:test";
import { paymentDisplayStatus } from "./payment-display-status";
import { cardPaymentOutcome } from "./card-payment-outcome";

test("each method reports its own outcome, without changing another paid method", () => {
  assert.equal(
    paymentDisplayStatus("confirmed", 2000, {
      kind: "failed",
      message: "old error",
    }),
    "success",
  );
  assert.equal(
    paymentDisplayStatus("draft", 10500, {
      kind: "failed",
      message: "QR not configured",
    }),
    "failed",
  );
  assert.equal(paymentDisplayStatus("draft", 0), "unused");
  assert.equal(paymentDisplayStatus("draft", 1000), "unpaid");
});
test("uncertain outcomes remain unknown, never falsely failed or paid", () => {
  assert.equal(paymentDisplayStatus("pending", 2000), "pending");
  assert.equal(
    paymentDisplayStatus("pending", 2000, {
      kind: "unknown",
      message: "connection lost",
    }),
    "unknown",
  );
  assert.equal(cardPaymentOutcome("APPROVED"), "confirmed");
  assert.equal(
    cardPaymentOutcome("DECLINED", "Insufficient balance"),
    "failed",
  );
  assert.equal(cardPaymentOutcome("FAILED", "Device not configured"), "failed");
  for (const message of [
    "Request timeout",
    "fetch failed",
    "Терминалын холболтын алдаа",
    "ECONNRESET",
  ])
    assert.equal(cardPaymentOutcome("FAILED", message), "pending");
  assert.equal(cardPaymentOutcome("PENDING"), "pending");
});
