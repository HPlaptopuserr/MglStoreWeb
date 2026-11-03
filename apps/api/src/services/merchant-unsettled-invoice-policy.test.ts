import assert from "node:assert/strict";
import test from "node:test";
import {
  merchantMutationRequiresSettledQr,
  merchantQrInvoiceBlocksCredentialChange,
} from "./merchant-unsettled-invoice-policy";

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

test("does not let an expired PENDING QR lock merchant settings forever", () => {
  const now = new Date("2026-10-08T10:00:00.000Z");

  assert.equal(
    merchantQrInvoiceBlocksCredentialChange(
      {
        status: "PENDING",
        consumedAt: null,
        expiresAt: new Date("2026-10-08T09:59:59.999Z"),
      },
      now,
    ),
    false,
  );
});

test("blocks only active unpaid QR invoices", () => {
  const now = new Date("2026-10-08T10:00:00.000Z");

  assert.equal(
    merchantQrInvoiceBlocksCredentialChange(
      {
        status: "PENDING",
        consumedAt: null,
        expiresAt: new Date("2026-10-08T10:00:00.001Z"),
      },
      now,
    ),
    true,
  );
  assert.equal(
    merchantQrInvoiceBlocksCredentialChange(
      {
        status: "PAID",
        consumedAt: null,
        expiresAt: new Date("2026-10-08T09:00:00.000Z"),
      },
      now,
    ),
    false,
  );
});

test("consumed QR invoices never block merchant settings", () => {
  const now = new Date("2026-10-08T10:00:00.000Z");

  assert.equal(
    merchantQrInvoiceBlocksCredentialChange(
      {
        status: "PAID",
        consumedAt: new Date("2026-10-08T09:30:00.000Z"),
        expiresAt: new Date("2026-10-08T09:00:00.000Z"),
      },
      now,
    ),
    false,
  );
});
