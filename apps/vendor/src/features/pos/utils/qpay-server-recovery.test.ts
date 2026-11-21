import assert from "node:assert/strict";
import test from "node:test";
import {
  isDefinitiveQPayCreationFailure,
  planQPayServerRecovery,
  saveQPayCheckoutAnchor,
  loadQPayCheckoutAnchor,
  clearQPayCheckoutAnchor,
  type QPayCheckoutScope,
  type RecoverableQPayInvoice,
} from "./qpay-server-recovery";

const scope: QPayCheckoutScope = {
  clientSaleId: "original-sale",
  branchId: "branch",
  shiftId: "shift",
  lines: [{ productId: "product", qty: 1, unitPrice: 8300 }],
};
const invoice: RecoverableQPayInvoice = {
  invoiceId: "original-invoice",
  amount: 8300,
  status: "EXPIRED",
  qrText: "qr",
  qrImage: "",
  expiresAt: "2026-11-20T00:00:00Z",
  createdAt: "2026-11-19T23:55:00Z",
  providerCancellationConfirmed: false,
  checkout: scope,
};
function storageMock(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    clear: () => map.clear(),
  };
}

test("empty QR ledger recovers the original expired unknown invoice and its exact amount", () => {
  const result = planQPayServerRecovery(scope, [invoice], []);
  assert.deepEqual(result.entries, [
    {
      id: "original-invoice",
      invoiceId: "original-invoice",
      method: "QR",
      amount: 8300,
      status: "pending",
    },
  ]);
  assert.equal(result.invoices.length, 1);
  assert.equal(
    result.entries[0].id,
    invoice.invoiceId,
    "no new bank request identity is invented",
  );
});
test("only provider-confirmed cancellation removes a recovery candidate and paid evidence wins", () => {
  assert.equal(
    planQPayServerRecovery(
      scope,
      [{ ...invoice, providerCancellationConfirmed: true }],
      [],
    ).entries.length,
    0,
  );
  assert.equal(
    planQPayServerRecovery(
      scope,
      [{ ...invoice, providerCancellationConfirmed: true, status: "PAID" }],
      [],
    ).entries[0].status,
    "confirmed",
  );
  const paid = {
    id: invoice.invoiceId,
    invoiceId: invoice.invoiceId,
    method: "QR" as const,
    amount: 8300,
    status: "confirmed" as const,
  };
  assert.equal(
    planQPayServerRecovery(scope, [invoice], [paid]).entries[0].status,
    "confirmed",
  );
});
test("changed basket, shift, branch or sale identity never attaches someone else's bank payment", () => {
  for (const changed of [
    { ...scope, clientSaleId: "other" },
    { ...scope, branchId: "other" },
    { ...scope, shiftId: "other" },
    { ...scope, lines: [{ ...scope.lines[0], qty: 2 }] },
  ])
    assert.throws(
      () => planQPayServerRecovery(changed, [invoice], []),
      /original-invoice/,
    );
  assert.equal(
    planQPayServerRecovery(
      scope,
      [invoice],
      [{ id: "cash", method: "CASH", amount: 100, status: "confirmed" }],
    ).entries.length,
    2,
  );
});
test("reload anchor preserves original sale, requires matching cart/register, and can be cleared after a definitive rejection", () => {
  const storage = storageMock();
  saveQPayCheckoutAnchor("org", "register", scope, storage);
  const basket = {
    branchId: scope.branchId,
    shiftId: scope.shiftId,
    lines: scope.lines,
  };
  assert.equal(
    loadQPayCheckoutAnchor("org", "register", basket, storage)?.clientSaleId,
    scope.clientSaleId,
  );
  assert.equal(
    loadQPayCheckoutAnchor("other", "register", basket, storage),
    null,
  );
  assert.equal(loadQPayCheckoutAnchor("org", "other", basket, storage), null);
  const changed = { ...basket, lines: [{ ...scope.lines[0], unitPrice: 100 }] };
  assert.throws(
    () => loadQPayCheckoutAnchor("org", "register", changed, storage),
    /өөр сагсанд/,
  );
  assert.equal(isDefinitiveQPayCreationFailure({ status: 409 }), false);
  assert.equal(
    isDefinitiveQPayCreationFailure(new TypeError("response lost")),
    false,
  );
  assert.equal(
    isDefinitiveQPayCreationFailure({
      status: 409,
      code: "QPAY_CHECKOUT_RECONCILIATION_REQUIRED",
    }),
    false,
  );
  assert.equal(
    isDefinitiveQPayCreationFailure({
      status: 409,
      code: "PAYMENT_NOT_STARTED",
    }),
    true,
  );
  clearQPayCheckoutAnchor("org", "register", "wrong-sale", storage);
  assert.ok(loadQPayCheckoutAnchor("org", "register", basket, storage));
  clearQPayCheckoutAnchor("org", "register", scope.clientSaleId, storage);
  assert.equal(
    loadQPayCheckoutAnchor("org", "register", changed, storage),
    null,
    "no-payment proof releases an otherwise mismatched anchor",
  );
});
