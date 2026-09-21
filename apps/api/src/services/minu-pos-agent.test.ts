import assert from "node:assert/strict";
import test from "node:test";
import {
  describeMinuAgentInvoiceError,
  parseMinuAgentTransactionResponse,
} from "./minu-pos-agent";

test("explains Minu device lookup errors with terminal and branch context", () => {
  const message = describeMinuAgentInvoiceError({
    message: "Төхөөрөмжийн мэдээлэл олдсонгүй",
    terminalId: "T6-123",
    branchId: "BRANCH-9",
  });

  assert.match(message, /terminalId "T6-123"/);
  assert.match(message, /branchId "BRANCH-9"/);
  assert.match(message, /Android Device ID\/serial биш/);
});

test("keeps unrelated Minu errors unchanged", () => {
  assert.equal(
    describeMinuAgentInvoiceError({
      message: "Нэвтрэх нэр эсвэл нууц үг буруу",
      terminalId: "T6-123",
      branchId: "BRANCH-9",
    }),
    "Нэвтрэх нэр эсвэл нууц үг буруу",
  );
});

test("accepts a paid Minu transaction when the terminal returns an RRN", () => {
  const result = parseMinuAgentTransactionResponse({
    status: "000",
    message: "Success",
    entity: {
      invoice: "MGL-123",
      status: null,
      rrn: "654321987654",
      error: null,
    },
  });

  assert.equal(result.approved, true);
  assert.equal(result.declined, false);
  assert.equal(result.pending, false);
  assert.equal(result.transactionId, "654321987654");
});

test("keeps a Minu transaction pending before an RRN is returned", () => {
  const result = parseMinuAgentTransactionResponse({
    status: "000",
    entity: {
      invoice: "MGL-123",
      status: null,
      rrn: null,
      error: null,
    },
  });

  assert.equal(result.approved, false);
  assert.equal(result.declined, false);
  assert.equal(result.pending, true);
});

test("keeps Minu status zero pending until payment proof arrives", () => {
  const result = parseMinuAgentTransactionResponse({
    status: "000",
    message: "Successful",
    entity: {
      invoice: "MGL-123",
      status: 0,
      rrn: null,
      error: false,
    },
  });

  assert.equal(result.approved, false);
  assert.equal(result.declined, false);
  assert.equal(result.pending, true);
});

test("keeps unknown Minu error values pending instead of declining immediately", () => {
  const result = parseMinuAgentTransactionResponse({
    status: "000",
    message: "Successful",
    entity: {
      invoice: "MGL-123",
      status: 0,
      rrn: null,
      error: "0064",
    },
  });

  assert.equal(result.approved, false);
  assert.equal(result.declined, false);
  assert.equal(result.pending, true);
});

test("keeps API status 000 pending when the terminal has no paid status or RRN", () => {
  const result = parseMinuAgentTransactionResponse({
    status: "000",
    message: "Successful",
    entity: {
      invoice: "MGL-123",
      status: null,
      rrn: null,
      error: true,
    },
  });

  assert.equal(result.approved, false);
  assert.equal(result.declined, false);
  assert.equal(result.pending, true);
  assert.equal(result.apiStatus, "000");
  assert.equal(result.terminalStatus, "");
});

test("accepts documented Minu success entity status 000 even when error is true", () => {
  const result = parseMinuAgentTransactionResponse({
    status: "000",
    message: "Successful",
    entity: {
      invoice: "09347095",
      status: "000",
      message: "Гүйлгээ амжилттай",
      rrn: null,
      error: "true",
    },
  });

  assert.equal(result.approved, true);
  assert.equal(result.declined, false);
  assert.equal(result.pending, false);
  assert.equal(result.apiStatus, "000");
  assert.equal(result.terminalStatus, "000");
});

test("keeps unknown Minu terminal states pending instead of declining them", () => {
  const result = parseMinuAgentTransactionResponse({
    status: "000",
    message: "Successful",
    entity: {
      invoice: "MGL-123",
      status: "CHECKED",
      rrn: null,
      error: null,
    },
  });

  assert.equal(result.approved, false);
  assert.equal(result.declined, false);
  assert.equal(result.pending, true);
});

test("does not approve an RRN response that contains a terminal error", () => {
  const result = parseMinuAgentTransactionResponse({
    status: "000",
    entity: {
      status: null,
      rrn: "654321987654",
      error: "DECLINED",
    },
  });

  assert.equal(result.approved, false);
  assert.equal(result.declined, true);
  assert.equal(result.pending, false);
});
