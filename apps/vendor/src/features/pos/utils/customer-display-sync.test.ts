import assert from "node:assert/strict";
import test from "node:test";
import type { CustomerDisplayPayload } from "../types/customer-display.types";
import {
  CUSTOMER_DISPLAY_PAYLOAD_KEY,
  CUSTOMER_DISPLAY_REQUEST,
  publishCustomerDisplayPayload,
  readCustomerDisplayPayload,
  readDisplayStorage,
  sendCustomerDisplayPayload,
} from "./customer-display-sync";

const payload: CustomerDisplayPayload = {
  lines: [],
  totals: { subTotal: 100, taxTotal: 0, discountTotal: 0, grandTotal: 100 },
  qpayModal: null,
  displayTheme: "white",
  ts: 123,
};

test("full localStorage cannot crash POS or block live customer display delivery", () => {
  const values = new Map([
    [CUSTOMER_DISPLAY_PAYLOAD_KEY, "stale display"],
    ["vendor_token", "session"],
    ["qpay-checkout-anchor", "unresolved payment"],
    ["cart-draft", "unsaved cart"],
  ]);
  const sent: unknown[] = [];
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: () => {
      throw new DOMException("Full", "QuotaExceededError");
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  assert.doesNotThrow(() =>
    publishCustomerDisplayPayload(payload, () => storage, {
      postMessage: (value: unknown) => sent.push(value),
    }),
  );
  assert.deepEqual(sent, [payload]);
  assert.equal(values.has(CUSTOMER_DISPLAY_PAYLOAD_KEY), false);
  assert.equal(values.get("vendor_token"), "session");
  assert.equal(values.get("qpay-checkout-anchor"), "unresolved payment");
  assert.equal(values.get("cart-draft"), "unsaved cart");
});

test("disabled storage and a closed display channel do not throw into checkout", () => {
  const storage = () => {
    throw new DOMException("Blocked", "SecurityError");
  };
  const channel = {
    postMessage: () => {
      throw new Error("Channel closed");
    },
  };
  assert.doesNotThrow(() =>
    publishCustomerDisplayPayload(payload, storage, channel),
  );
  assert.equal(readDisplayStorage(CUSTOMER_DISPLAY_PAYLOAD_KEY, storage), null);
});

test("normal publication persists a recoverable snapshot and broadcasts the same payload", () => {
  const values = new Map<string, string>();
  const sent: unknown[] = [];
  publishCustomerDisplayPayload(
    payload,
    () => ({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    }),
    { postMessage: (value: unknown) => sent.push(value) },
  );
  assert.deepEqual(
    JSON.parse(values.get(CUSTOMER_DISPLAY_PAYLOAD_KEY)!),
    payload,
  );
  assert.deepEqual(sent, [payload]);
});

test("a newly opened display can receive its initial state without a persisted snapshot", () => {
  let received: CustomerDisplayPayload | null = null;
  sendCustomerDisplayPayload(payload, {
    postMessage: (value: unknown) => {
      received = readCustomerDisplayPayload(value);
    },
  });
  assert.deepEqual(received, payload);
  assert.equal(readCustomerDisplayPayload(CUSTOMER_DISPLAY_REQUEST), null);
  assert.equal(readCustomerDisplayPayload({ ...payload, totals: {} }), null);
  assert.equal(
    readCustomerDisplayPayload({
      ...payload,
      totals: { ...payload.totals, grandTotal: NaN },
    }),
    null,
  );
});
