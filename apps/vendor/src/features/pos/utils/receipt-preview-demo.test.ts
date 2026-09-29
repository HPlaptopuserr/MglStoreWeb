import assert from "node:assert/strict";
import test from "node:test";
import { withDemoEbarimt } from "./receipt-preview-demo";
import { createSalesHistoryDemo } from "./sales-history-demo";

test("demo QR only changes a display copy and is clearly marked as test", () => {
  const receipt = createSalesHistoryDemo()[0];
  const original = JSON.stringify(receipt);
  const preview = withDemoEbarimt(receipt);
  assert.equal(JSON.stringify(receipt), original);
  assert.notEqual(preview, receipt);
  assert.match(preview.ebarimt?.qrData ?? "", /NOT A VALID EBARIMT/);
  assert.match(preview.ebarimt?.lottery ?? "", /^TEST-/);
  assert.equal(preview.grandTotal, receipt.grandTotal);
});
