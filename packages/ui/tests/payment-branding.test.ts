import assert from "node:assert/strict";
import test from "node:test";
import { formatPaymentBranding } from "../src/lib/payment-branding";

test("historical payment descriptions and enum labels display Minu without mutating input", () => {
  const entry = { method: "QPAY", note: "QPay автомат баталгаажуулалт; qpay төлбөр" };
  assert.equal(formatPaymentBranding(entry.method), "Minu");
  assert.equal(formatPaymentBranding(entry.note), "Minu автомат баталгаажуулалт; Minu төлбөр");
  assert.equal(entry.method, "QPAY");
  assert.equal(entry.note, "QPay автомат баталгаажуулалт; qpay төлбөр");
  assert.equal(formatPaymentBranding("qpay_invoice_1"), "qpay_invoice_1");
  assert.equal(formatPaymentBranding(null), "");
});
