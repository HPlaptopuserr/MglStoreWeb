import assert from "node:assert/strict";
import test from "node:test";
import {
  createSystemQrInvoiceProviderError,
  findSystemQrSubMerchantByCode,
  SYSTEMQR_MERCHANT_NOT_AUTHORIZED,
} from "./systemqr";

const merchants = [
  {
    merchantCode: "MGL_STEPPE_1783745574137",
    merchantName: "Aru coffee shop",
    merchantNo: "000000010030442",
    terminalNo: "70030610",
    createdDate: "2026-09-23",
  },
];

test("manual SystemQR merchant validation matches a canonical code", () => {
  assert.equal(
    findSystemQrSubMerchantByCode(
      merchants,
      "  mgl_steppe_1783745574137  ",
    )?.merchantCode,
    "MGL_STEPPE_1783745574137",
  );
});

test("manual SystemQR merchant validation rejects an unknown code", () => {
  assert.equal(
    findSystemQrSubMerchantByCode(merchants, "MGL_STEPPE_UNKNOWN"),
    null,
  );
});

test("SystemQR createInvoice 002 has a stable public error code", () => {
  const error = createSystemQrInvoiceProviderError(
    "002",
    "SystemQR invoice creation failed",
  );

  assert.equal(error.code, SYSTEMQR_MERCHANT_NOT_AUTHORIZED);
  assert.equal(error.status, 403);
  assert.equal(error.providerStatus, "002");
  assert.match(error.message, /create\/check\/cancel/);
});

test("other SystemQR createInvoice failures remain provider errors", () => {
  const error = createSystemQrInvoiceProviderError("999", "Provider down");

  assert.equal(error.code, "SYSTEMQR_INVOICE_CREATE_FAILED");
  assert.equal(error.status, 502);
  assert.equal(error.providerStatus, "999");
  assert.match(error.message, /Provider down/);
});
