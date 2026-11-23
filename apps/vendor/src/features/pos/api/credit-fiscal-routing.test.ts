import assert from "node:assert/strict";
import test from "node:test";
import { attachEbarimtReceipt } from "./ebarimt";
import {
  issueRecoverableEbarimt,
  retryEbarimtAttachments,
} from "../utils/ebarimt-attachment-recovery";

test("installment fiscal recovery attaches the saved bill to its ledger and never issues another bill", async () => {
  const entries = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return entries.size;
    },
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
    removeItem: (key) => {
      entries.delete(key);
    },
    key: (index) => [...entries.keys()][index] ?? null,
    clear: () => entries.clear(),
  };
  const previousFetch = globalThis.fetch;
  const targets: string[] = [];
  let attachmentFails = true;
  let issued = 0;
  const payload = {
    status: "SUCCESS" as const,
    billId: "one-existing-bill",
    payload: { totalAmount: 30000 },
  };
  globalThis.fetch = async (input) => {
    targets.push(String(input));
    return Response.json(
      attachmentFails ? { message: "offline" } : { ebarimt: payload },
      { status: attachmentFails ? 503 : 200 },
    );
  };
  try {
    await issueRecoverableEbarimt(
      "local-fiscal",
      "credit-payment:ledger",
      async (beforeDispatch) => {
        issued++;
        beforeDispatch();
        return payload;
      },
      storage,
    );
    assert.equal(
      await retryEbarimtAttachments(
        "local-fiscal",
        attachEbarimtReceipt,
        storage,
      ),
      1,
    );
    assert.equal(storage.length, 1);
    attachmentFails = false;
    assert.equal(
      await retryEbarimtAttachments(
        "local-fiscal",
        attachEbarimtReceipt,
        storage,
      ),
      0,
    );
    assert.equal(storage.length, 0);
    assert.equal(issued, 1);
    assert.ok(
      targets.every((url) =>
        url.endsWith("/api/pos/credit-payments/ledger/ebarimt"),
      ),
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});
