import test from "node:test";
import assert from "node:assert/strict";
import {
  assertReadyForReview,
  parseCountEdits,
  stockChanged,
  stocktakePermissions,
} from "./stocktake.policy";

test("null is uncounted while explicit zero is a real count", () => {
  assert.throws(() =>
    assertReadyForReview("FULL", [{ expected: 4, counted: null, note: "" }]),
  );
  assert.doesNotThrow(() =>
    assertReadyForReview("FULL", [
      { expected: 4, counted: 0, note: "Бараа алга" },
    ]),
  );
  assert.doesNotThrow(() =>
    assertReadyForReview("PARTIAL", [
      { expected: 4, counted: null, note: "" },
      { expected: 0, counted: 0, note: "" },
    ]),
  );
  assert.throws(() =>
    assertReadyForReview("PARTIAL", [{ expected: 4, counted: 2, note: " " }]),
  );
});
test("count input rejects duplicates, malformed quantities and excessive payloads", () => {
  for (const counted of [-1, 1.5, Infinity, NaN, "2", 2147483648])
    assert.throws(() => parseCountEdits([{ id: "a", counted, note: "" }]));
  assert.throws(() =>
    parseCountEdits([
      { id: "a", counted: 1, note: "" },
      { id: "a", counted: 2, note: "" },
    ]),
  );
  assert.throws(() => parseCountEdits([]));
  assert.throws(() =>
    parseCountEdits(
      Array.from({ length: 501 }, (_, index) => ({
        id: String(index),
        counted: 0,
        note: "",
      })),
    ),
  );
  assert.deepEqual(parseCountEdits([{ id: "a", counted: null, note: " x " }]), [
    { id: "a", counted: null, note: "x" },
  ]);
});
test("cashiers can count only their org; only stock managers/owners can approve", () => {
  const cashier = {
    role: "USER",
    organizationId: "org-a",
    orgRole: "STAFF",
    capabilities: ["POS_CASHIER"],
  };
  assert.deepEqual(stocktakePermissions(cashier, "org-a"), {
    canCount: true,
    canApprove: false,
  });
  assert.deepEqual(stocktakePermissions(cashier, "org-b"), {
    canCount: false,
    canApprove: false,
  });
  assert.equal(
    stocktakePermissions(
      { ...cashier, capabilities: ["STOCK_MANAGER"] },
      "org-a",
    ).canApprove,
    true,
  );
  assert.equal(
    stocktakePermissions(
      { ...cashier, orgRole: "VIEWER", capabilities: [] },
      "org-a",
    ).canCount,
    false,
  );
});
test("equal quantity after intervening movement still requires a recount", () => {
  const row = { expected: 5, unit: "pcs", stockUpdatedAt: new Date(1000) };
  assert.equal(stockChanged(row, { ...row }), false);
  assert.equal(
    stockChanged(row, { ...row, stockUpdatedAt: new Date(2000) }),
    true,
  );
  assert.equal(stockChanged(row, { ...row, unit: "kg" }), true);
  assert.equal(stockChanged(row, undefined), true);
});
