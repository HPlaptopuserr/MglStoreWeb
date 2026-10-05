import assert from "node:assert/strict";
import test from "node:test";
import { merchantMutationRequiresSettledQr } from "./merchant-unsettled-invoice-policy";

test("allows Minu Agent settings to change while a Dynamic QR invoice is unsettled", () => {
  assert.equal(merchantMutationRequiresSettledQr("/minu/connect"), false);
  assert.equal(merchantMutationRequiresSettledQr("/minu/disconnect"), false);
});

test("keeps the unsettled-invoice guard on QR merchant credential changes", () => {
  assert.equal(merchantMutationRequiresSettledQr("/connect"), true);
  assert.equal(merchantMutationRequiresSettledQr("/disconnect"), true);
  assert.equal(merchantMutationRequiresSettledQr("/register"), true);
});

test("continues to allow bank-account-only changes", () => {
  assert.equal(merchantMutationRequiresSettledQr("/bank-accounts"), false);
});
