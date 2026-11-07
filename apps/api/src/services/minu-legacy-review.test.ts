import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyLegacyMinuResult,
  planLegacyMinuReview,
} from "./minu-legacy-review";
import { Prisma, type CardPaymentAttempt } from "@prisma/client";
import {
  parseMinuAgentTransactionResponse,
  type MinuTxnEntity,
} from "./minu-pos-agent";

function classify(entity: MinuTxnEntity, apiStatus = "000") {
  return classifyLegacyMinuResult({
    invoice: "original",
    branchId: "branch",
    result: parseMinuAgentTransactionResponse({
      status: apiStatus,
      entity: { branchId: "branch", ...entity },
    }),
  });
}
test("historical review requires the original invoice and merchant branch", () => {
  for (const entity of [
    { status: "000" },
    { invoice: "other", status: "000" },
    { invoice: "original", status: "000", branchId: undefined },
    { invoice: "original", status: "000", branchId: "other" },
  ])
    assert.equal(classify(entity), "IDENTITY_UNVERIFIED");
  assert.equal(
    classify({ invoice: "original", status: "000" }),
    "VERIFIED_APPROVED",
  );
  assert.equal(
    classify({
      invoice: "original",
      status: "000",
      terminalId: "bank-terminal-reference",
    }),
    "VERIFIED_APPROVED",
  );
});
test("unknown numeric codes and generic errors cannot cancel old payments", () => {
  for (const status of ["0", "10", "0064", "FAILED", "ERROR", "CHECKED"]) {
    assert.equal(classify({ invoice: "original", status }), "UNRESOLVED");
  }
  assert.equal(
    classify({ invoice: "original", status: "DECLINED" }, "ERROR"),
    "UNRESOLVED",
  );
  assert.equal(
    classify({ invoice: "original", status: null, error: "0064" }),
    "UNRESOLVED",
  );
});
test("only explicit terminal approval or refusal resolves a historical payment", () => {
  assert.equal(
    classify({
      invoice: "original",
      status: null,
      rrn: "bank-reference",
      error: null,
    }),
    "VERIFIED_APPROVED",
  );
  assert.equal(
    classify({ invoice: "original", status: "DECLINED" }),
    "VERIFIED_DECLINED",
  );
});
test("the observed terminal cancellation resolves only its original invoice and branch", () => {
  const entity = {
    invoice: "original",
    status: "10",
    error: "true",
    message: "Цуцлагдлаа",
    rrn: null,
  };
  assert.equal(classify(entity), "VERIFIED_DECLINED");
  assert.equal(
    classify({ ...entity, invoice: "different" }),
    "IDENTITY_UNVERIFIED",
  );
  assert.equal(
    classify({ ...entity, branchId: "different" }),
    "IDENTITY_UNVERIFIED",
  );
  assert.equal(classify({ ...entity, rrn: "bank-reference" }), "UNRESOLVED");
});

test("observed insufficient funds resolves only the matching historical invoice and merchant", () => {
  const entity = { invoice: "original", status: "10", error: "true", message: "Үлдэгдэл хүрээгүй", rrn: null };
  assert.equal(classify(entity), "VERIFIED_DECLINED");
  assert.equal(classify({ ...entity, invoice: "other" }), "IDENTITY_UNVERIFIED");
  assert.equal(classify({ ...entity, branchId: "other" }), "IDENTITY_UNVERIFIED");
  assert.equal(classify({ ...entity, rrn: "bank-reference" }), "UNRESOLVED");
});

test("reconciliation plans preserve unknown payments and condition every write on its original version", () => {
  const attempt: CardPaymentAttempt = {
    id: "attempt",
    organizationId: "org",
    registerId: "register",
    terminalId: "agent-terminal",
    initiatedById: null,
    bridgeUrl: null,
    status: "PENDING",
    amount: new Prisma.Decimal(12000),
    transactionId: null,
    traceno: null,
    message: null,
    providerPayload: { provider: "MINU_AGENT", invoice: "original" },
    createdAt: new Date(),
    updatedAt: new Date(),
    consumedAt: null,
    saleReference: null,
  };
  const plan = (entity: MinuTxnEntity, applyVerified = true) =>
    planLegacyMinuReview({
      attempt,
      result: parseMinuAgentTransactionResponse({
        status: "000",
        entity: { branchId: "branch", ...entity },
      }),
      branchId: "branch",
      runId: "audit",
      checkedAt: new Date(),
      applyVerified,
    });
  const pending = plan({
    invoice: "original",
    status: "10",
    error: "true",
    message: "Successful",
  })!;
  assert.equal(pending.args.data.status, undefined);
  assert.equal(pending.args.data.transactionId, undefined);
  assert.equal(pending.statusChanged, false);
  assert.equal(pending.args.where?.updatedAt, attempt.updatedAt);
  assert.equal(pending.args.where?.consumedAt, null);
  const cancelled = plan({
    invoice: "original",
    status: "10",
    error: "true",
    message: "Цуцлагдлаа",
    rrn: null,
  })!;
  assert.equal(cancelled.args.data.status, "DECLINED");
  assert.equal(cancelled.args.data.consumedAt, undefined);
  const paid = plan({
    invoice: "original",
    status: "000",
    rrn: "bank-proof",
    terminalId: "bank-terminal",
  })!;
  assert.equal(paid.args.data.status, "APPROVED");
  assert.equal(paid.args.data.traceno, "bank-proof");
  assert.equal(
    plan({ invoice: "other", status: "000", rrn: "bank-proof" })?.args.data
      .status,
    undefined,
  );
  assert.equal(
    plan({ invoice: "original", status: "000", rrn: "bank-proof" }, false)?.args
      .data.status,
    undefined,
  );
  assert.equal(
    plan({ invoice: "original", status: "000" })?.args.data.status,
    undefined,
    "historical approval writes additionally require a bank RRN",
  );
  assert.equal(plan({ invoice: "original", status: "10", error: "true", message: "Үлдэгдэл хүрээгүй" })?.args.data.message, "Үлдэгдэл хүрээгүй");
  attempt.providerPayload = {
    provider: "MINU_AGENT",
    invoice: "original",
    checkout: { clientSaleId: "reserved-sale" },
  };
  assert.equal(
    plan({
      invoice: "original",
      status: "10",
      error: "true",
      message: "Цуцлагдлаа",
    }),
    null,
    "reserved checkouts must use the live atomic reconciliation service",
  );
});
