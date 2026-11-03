import assert from "node:assert/strict";
import test from "node:test";
import { receiptAction } from "./receipt-flow";

test("personal receipts issue without a second buyer-choice dialog", () => {
  assert.equal(
    receiptAction({ enabled: true, creditSale: false, companyReceipt: false }),
    "ISSUE_PERSONAL",
  );
  assert.equal(
    receiptAction({ enabled: true, creditSale: false, companyReceipt: true }),
    "ASK_COMPANY",
  );
});
test("disabled eBarimt and credit sales retain their existing receipt behavior", () => {
  for (const companyReceipt of [true, false]) {
    assert.equal(
      receiptAction({ enabled: false, creditSale: false, companyReceipt }),
      "NONE",
    );
    assert.equal(
      receiptAction({ enabled: true, creditSale: true, companyReceipt }),
      "NONE",
    );
  }
});
