import assert from "node:assert/strict";
import test from "node:test";
import type { PosReceipt } from "@mgl/types";
import { createTestQrReceipt } from "./test-qr-receipt";

const source: PosReceipt = {
  id: "existing-sale-id",
  receiptNo: "POS-20260917-979482",
  branchName: "Төв салбар",
  cashierName: "Тест кассчин",
  paymentMethod: "CASH",
  status: "COMPLETED",
  createdAt: "2026-09-17T09:56:19.000Z",
  lines: [],
  subTotal: 5500,
  taxTotal: 500,
  discountTotal: 0,
  grandTotal: 5500,
  ebarimt: {
    status: "SUCCESS",
    billId: "real-bill",
    qrData: "existing-real-qr",
  },
};

test("test print receipt uses explicit test identifiers without changing the sale or its real tax data", () => {
  const before = JSON.stringify(source);
  const sample = createTestQrReceipt(source);

  assert.equal(JSON.stringify(source), before);
  assert.notEqual(sample, source);
  assert.notEqual(sample.ebarimt, source.ebarimt);
  assert.match(sample.id, /^TEST-/);
  assert.match(sample.receiptNo, /^TEST-/);
  assert.match(sample.ebarimt?.billId || "", /^TEST-/);
  assert.match(sample.ebarimt?.qrData || "", /TEST_PRINT_ONLY/);
  assert.match(sample.ebarimt?.qrData || "", /NOT_A_TAX_RECEIPT/);
  assert.doesNotMatch(sample.ebarimt?.qrData || "", /existing-real-qr/);
  assert.equal(sample.grandTotal, source.grandTotal);
});

test("test receipt creation is blocked in production", () => {
  const previous = process.env.NODE_ENV;
  try {
    Object.assign(process.env, { NODE_ENV: "production" });
    assert.throws(() => createTestQrReceipt(source), /хөгжүүлэлтийн орчинд/);
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: previous });
  }
});
