import assert from "node:assert/strict";
import test from "node:test";
import { androidPgwResultStatus, hasAndroidPgwCancellation } from "./android-pgw-result";

const attemptId = "cancelled-attempt";
const cancelled = {
  provider: "ANDROID_PGW", status: "FAILED", code: "-21",
  message: "Гүйлгээ цуцлагдсан", data: attemptId, transactionId: attemptId,
  terminal: "TEST-TERMINAL", rrn: null, appCode: null,
  parsed: { code: -21, desc: "Гүйлгээ цуцлагдсан", terminal: "TEST-TERMINAL", rrn: "" },
};

test("the legacy PGW -21 cancellation is declined without a new payment", () => {
  assert.equal(androidPgwResultStatus(cancelled, attemptId), "DECLINED");
});

test("timeouts, unknown negative codes and cancellation text alone remain pending", () => {
  for (const result of [
    {}, { status: "FAILED", message: "Timeout" },
    { status: "FAILED", message: cancelled.message },
    { ...cancelled, code: "-99", parsed: { ...cancelled.parsed, code: -99 } },
    { ...cancelled, parsed: null }, { ...cancelled, parsed: { code: -21 } },
    { ...cancelled, code: "0" }, { ...cancelled, message: "Unknown" },
    { ...cancelled, parsed: { ...cancelled.parsed, desc: "Unknown" } },
  ]) assert.equal(androidPgwResultStatus(result, attemptId), "PENDING");
});

test("cancellation requires the same attempt, terminal and Android provider", () => {
  for (const result of [
    { ...cancelled, data: "another-attempt" }, { ...cancelled, data: undefined },
    { ...cancelled, parsed: { ...cancelled.parsed, data: "another-attempt" } },
    { ...cancelled, terminal: "another-terminal" },
    { ...cancelled, provider: "MINU_AGENT" }, { ...cancelled, manualCard: true },
  ]) assert.equal(hasAndroidPgwCancellation(result, attemptId), false);
});

test("conflicting bank evidence cannot release a pending cancellation", () => {
  for (const result of [
    { ...cancelled, rrn: "bank-reference" }, { ...cancelled, appCode: "APP123" },
    { ...cancelled, transactionId: "bank-transaction" },
    { ...cancelled, parsed: { ...cancelled.parsed, rrn: "bank-reference" } },
    { ...cancelled, parsed: { ...cancelled.parsed, approval_code: "APP123" } },
    { ...cancelled, parsed: { ...cancelled.parsed, transactionId: "bank-transaction" } },
    { ...cancelled, parsed: { ...cancelled.parsed, status: "APPROVED" } },
    { ...cancelled, parsed: { ...cancelled.parsed, succeed: true } },
  ]) assert.equal(androidPgwResultStatus(result, attemptId), "PENDING");
});

test("explicit terminal approval and preflight decline keep their existing behavior", () => {
  assert.equal(androidPgwResultStatus({ status: "APPROVED", rrn: "bank-reference" }, attemptId), "APPROVED");
  assert.equal(androidPgwResultStatus({ status: "DECLINED", message: "Төлбөр эхлээгүй" }, attemptId), "DECLINED");
});
