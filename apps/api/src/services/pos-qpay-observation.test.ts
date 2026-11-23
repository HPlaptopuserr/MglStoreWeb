import assert from "node:assert/strict";
import test from "node:test";
import { observePosQrReconciliation } from "./pos-qpay-reconciliation";

test("a UI observation deadline retains the bank work and its later verified result", async () => {
  let complete: (paid: boolean) => void = () => {};
  let settled = false;
  const providerWork = new Promise<boolean>(resolve => { complete = resolve; })
    .then(paid => { settled = true; return paid; });
  assert.equal(await observePosQrReconciliation(providerWork, 2), "PENDING");
  assert.equal(settled, false);
  complete(true);
  assert.equal(await providerWork, true);
  assert.equal(settled, true);
});

test("fast bank evidence or errors are returned without waiting for the UI deadline", async () => {
  assert.equal(await observePosQrReconciliation(Promise.resolve(true), 100), "COMPLETE");
  assert.equal(await observePosQrReconciliation(Promise.resolve(false), 100), "COMPLETE");
  await assert.rejects(observePosQrReconciliation(Promise.reject(new Error("Provider unavailable")), 100), /Provider unavailable/);
});
