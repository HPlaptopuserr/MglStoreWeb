import assert from "node:assert/strict";
import test from "node:test";
import { currentWarehouseMonth } from "@mgl/types";
import { parseDividendInput } from "./warehouse-dividend.policy";
import { parseDividendChoice } from "./warehouse-dividend-decision.policy";

test("dividend month uses Ulaanbaatar boundaries", () => {
  assert.equal(
    currentWarehouseMonth(new Date("2026-10-31T15:59:59Z")),
    "2026-10",
  );
  assert.equal(
    currentWarehouseMonth(new Date("2026-10-31T16:00:00Z")),
    "2026-11",
  );
});
test("monthly amounts require current month, decimal money and matching version", () => {
  assert.deepEqual(
    parseDividendInput(
      { month: "2026-10", amount: "0.00", version: 0 },
      "2026-10",
    ),
    { month: "2026-10", amount: "0.00", version: 0 },
  );
  for (const body of [
    { month: "2026-09", amount: "1", version: 0 },
    { month: "2026-10", amount: "-1", version: 0 },
    { month: "2026-10", amount: "1.001", version: 0 },
    { month: "2026-10", amount: "1", version: 0, mode: "TOP_UP" },
  ])
    assert.throws(() => parseDividendInput(body, "2026-10"));
});
test("dividend choice rejects invalid bank information and ignores bank fields for reinvestment", () => {
  assert.deepEqual(
    parseDividendChoice({
      choice: "REINVEST",
      version: 1,
      bankAccount: "ignore",
    }),
    {
      choice: "REINVEST",
      version: 1,
      bankName: null,
      bankAccount: null,
      bankAccountName: null,
    },
  );
  assert.equal(
    parseDividendChoice({
      choice: "BANK_TRANSFER",
      version: 1,
      bankName: "Bank",
      bankAccount: "MN12 3456 7890 1234 5678",
      bankAccountName: "Investor",
    }).bankAccount,
    "MN123456789012345678",
  );
  for (const body of [
    { choice: "CASH", version: 1 },
    { choice: "REINVEST", version: 0 },
    { choice: "BANK_TRANSFER", version: 1 },
    {
      choice: "BANK_TRANSFER",
      version: 1,
      bankName: "Bank",
      bankAccount: "<script>",
      bankAccountName: "Name",
    },
  ])
    assert.throws(() => parseDividendChoice(body));
});
