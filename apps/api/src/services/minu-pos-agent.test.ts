import assert from "node:assert/strict";
import test from "node:test";
import {
  describeMinuAgentInvoiceError,
  minuPendingPaymentMessage,
  parseMinuAgentTransactionResponse,
  isMinuTerminalCancellation,
  isMinuInsufficientFunds,
  isMinuTerminalRefusal,
} from "./minu-pos-agent";

test("explicit terminal errors settle without interpreting all code 10 replies as declines", () => {
  for (const message of ["Not permitted", "Transaction refused", "Пин буруу", "System Error", "SystemError", " SYSTEM ERROR ", "пин буруу"]) {
    const response = { status: "000", message: "Successful", entity: {
      invoice: "MGL-original", status: "10", error: "true", message, rrn: null,
    } };
    assert.equal(isMinuTerminalRefusal(response), true);
    const result = parseMinuAgentTransactionResponse(response);
    assert.equal(result.declined, true);
    assert.equal(result.approved, false);
    assert.equal(result.pending, false);
    assert.equal(result.message, message);
    for (const changed of [
      { ...response, status: "0064" },
      { ...response, entity: { ...response.entity, status: "0" } },
      { ...response, entity: { ...response.entity, error: "false" } },
      { ...response, entity: { ...response.entity, invoice: "" } },
      { ...response, entity: { ...response.entity, rrn: "bank-reference" } },
    ]) {
      assert.equal(isMinuTerminalRefusal(changed), false);
      assert.equal(parseMinuAgentTransactionResponse(changed).declined, false);
    }
  }
  for (const message of ["Чипээр уншуулна уу", "Transaction needs to be entered again", "Successful", "Not permitted; checking", "System Error; checking", "Пин буруу; дахин оруулна уу", ""]) {
    const result = parseMinuAgentTransactionResponse({ status: "000", entity: {
      invoice: "MGL-original", status: "10", error: "true", message, rrn: null,
    } });
    assert.equal(result.pending, true, message);
    assert.equal(result.declined, false, message);
  }
});

test("the observed insufficient-funds response declines and preserves the terminal explanation", () => {
  const response = { status: "000", message: "Successful", entity: {
    invoice: "MGL-original", status: "10", error: "true", message: "Үлдэгдэл хүрээгүй", rrn: null,
  } };
  assert.equal(isMinuInsufficientFunds(response), true);
  const result = parseMinuAgentTransactionResponse(response);
  assert.equal(result.declined, true);
  assert.equal(result.approved, false);
  assert.equal(result.pending, false);
  assert.equal(result.message, "Үлдэгдэл хүрээгүй");
  for (const changed of [
    { ...response, status: "0064" },
    { ...response, entity: { ...response.entity, status: "0" } },
    { ...response, entity: { ...response.entity, message: "Successful" } },
    { ...response, entity: { ...response.entity, invoice: "" } },
    { ...response, entity: { ...response.entity, error: "false" } },
    { ...response, entity: { ...response.entity, rrn: "existing-bank-reference" } },
  ]) {
    assert.equal(isMinuInsufficientFunds(changed), false);
    assert.equal(parseMinuAgentTransactionResponse(changed).declined, false);
  }
});

test("the observed Minu code 10 cancellation requires the exact terminal message and no RRN", () => {
  const response = { status: "000", message: "Successful", entity: {
    invoice: "MGL-original", status: "10", error: "true", message: "Цуцлагдлаа", rrn: null,
  } };
  assert.equal(isMinuTerminalCancellation(response), true);
  assert.equal(parseMinuAgentTransactionResponse(response).declined, true);
  assert.equal(parseMinuAgentTransactionResponse({ ...response, entity: { ...response.entity, message: "Гүйлгээ цуцлагдлаа" } }).declined, true);
  for (const changed of [
    { ...response, status: "0064" },
    { ...response, entity: { ...response.entity, message: "Successful" } },
    { ...response, entity: { ...response.entity, rrn: "existing-bank-reference" } },
    { ...response, entity: { ...response.entity, invoice: "" } },
    { ...response, entity: { ...response.entity, error: "0064" } },
  ]) assert.equal(isMinuTerminalCancellation(changed), false);
});

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

test("a terminal error conflicting with an RRN stays pending and cannot unlock", () => {
  const result = parseMinuAgentTransactionResponse({
    status: "000",
    entity: {
      status: null,
      rrn: "654321987654",
      error: "DECLINED",
    },
  });

  assert.equal(result.approved, false);
  assert.equal(result.declined, false);
  assert.equal(result.pending, true);
});

test("API errors and unidentified refusals cannot prove an unsuccessful card charge", () => {
  for (const response of [
    { status: "ERROR", message: "System Error" },
    { status: "FAILED", entity: { invoice: "MGL-original", status: "FAILED" } },
    { status: "000", entity: { status: "DECLINED", error: "DECLINED" } },
    { status: "000", entity: { invoice: "MGL-original", status: "DECLINED", rrn: "bank-reference" } },
  ]) {
    const result = parseMinuAgentTransactionResponse(response);
    assert.equal(result.pending, true);
    assert.equal(result.declined, false);
    assert.equal(result.approved, false);
  }
});

test("pending diagnostics show terminal errors without presenting API success as payment success", () => {
  assert.match(minuPendingPaymentMessage("System Error"), /System Error/);
  assert.match(minuPendingPaymentMessage("Пин буруу"), /Пин буруу/);
  for (const message of [null, "", "Successful", "Success", "OK"]) {
    const display = minuPendingPaymentMessage(message);
    assert.match(display, /баталгаажаагүй/);
    assert.doesNotMatch(display, /Successful|Success|OK/);
  }
});
