import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { parseInvestmentTopUp } from "./warehouse-investment-topup.policy";

test("investor deposits accept only positive exact decimal amounts, methods, and retry IDs", () => {
  const valid = { requestId: randomUUID(), amount: "100000.25", method: "QR" };
  assert.deepEqual(parseInvestmentTopUp(valid), valid);
  for (const amount of [
    "0",
    "-1",
    "1e6",
    "1.234",
    "1000000000000",
    100,
    null,
  ]) {
    assert.throws(() => parseInvestmentTopUp({ ...valid, amount }));
  }
  for (const method of ["SET", "CASH", "", undefined])
    assert.throws(() => parseInvestmentTopUp({ ...valid, method }));
  assert.throws(() =>
    parseInvestmentTopUp({ ...valid, requestId: "duplicate" }),
  );
});
