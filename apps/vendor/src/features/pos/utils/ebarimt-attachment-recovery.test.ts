import test from "node:test";
import assert from "node:assert/strict";
import {
  acknowledgeEbarimtAttachment,
  hasDurableEbarimtPayload,
  issueRecoverableEbarimt,
  retryEbarimtAttachments,
} from "./ebarimt-attachment-recovery";
import type { AttachEbarimtPayload } from "../api/ebarimt";

function memoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    key: (index) => Array.from(entries.keys())[index] ?? null,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
    removeItem: (key) => {
      entries.delete(key);
    },
  };
}
const fiscal: AttachEbarimtPayload = {
  status: "SUCCESS",
  billId: "bill",
  qrData: "qr",
  receiptType: "B2B",
  customerTin: "12345678901",
};

test("successful fiscal result survives attachment failure and reload; recovery only attaches", async () => {
  const storage = memoryStorage();
  await issueRecoverableEbarimt(
    "org-durable",
    "sale",
    async (beforeDispatch) => {
      beforeDispatch();
      return fiscal;
    },
    storage,
  );
  assert.equal(hasDurableEbarimtPayload("org-durable", "sale", storage), true);
  assert.equal(
    await retryEbarimtAttachments(
      "org-durable",
      async () => {
        throw new Error("offline");
      },
      storage,
    ),
    1,
  );
  assert.equal(storage.length, 1);
  const reloaded = memoryStorage();
  const key = storage.key(0)!;
  reloaded.setItem(key, storage.getItem(key)!);
  let attached = 0;
  await retryEbarimtAttachments(
    "other-org",
    async () => {
      throw new Error("wrong scope");
    },
    reloaded,
  );
  assert.equal(reloaded.length, 1);
  assert.equal(
    await retryEbarimtAttachments(
      "org-durable",
      async (saleId, payload) => {
        assert.equal(saleId, "sale");
        assert.deepEqual(payload, fiscal);
        attached++;
      },
      reloaded,
    ),
    0,
  );
  assert.equal(attached, 1);
  assert.equal(reloaded.length, 0);
});

test("a persisted successful B2B receipt is reused without issuing another fiscal receipt", async () => {
  const storage = memoryStorage();
  storage.setItem(
    "mglstore.pos.ebarimt-attachment.v1:org-reload:sale",
    JSON.stringify({ state: "READY", payload: fiscal }),
  );
  const result = await issueRecoverableEbarimt(
    "org-reload",
    "sale",
    async () => {
      throw new Error("must not issue");
    },
    storage,
  );
  assert.deepEqual(result, fiscal);
});

test("unknown fiscal POST outcome blocks reissue after reload, while pre-dispatch errors allow retry", async () => {
  const storage = memoryStorage();
  await assert.rejects(
    issueRecoverableEbarimt(
      "org-uncertain",
      "sale",
      async (mark) => {
        mark();
        throw new Error("lost response");
      },
      storage,
    ),
    /lost response/,
  );
  await assert.rejects(
    issueRecoverableEbarimt(
      "org-uncertain",
      "sale",
      async () => {
        throw new Error("must not issue");
      },
      storage,
    ),
    /тодорхойгүй/,
  );
  await assert.rejects(
    issueRecoverableEbarimt(
      "org-preflight",
      "sale",
      async () => {
        throw new Error("info unavailable");
      },
      storage,
    ),
    /info unavailable/,
  );
  assert.deepEqual(
    await issueRecoverableEbarimt(
      "org-preflight",
      "sale",
      async (mark) => {
        mark();
        return fiscal;
      },
      storage,
    ),
    fiscal,
  );
});

test("if successful payload persistence fails, the same page retains it and never issues again", async () => {
  const storage = memoryStorage();
  const setItem = storage.setItem;
  storage.setItem = (key, value) => {
    if (value.includes('"READY"')) throw new Error("quota");
    setItem(key, value);
  };
  assert.deepEqual(
    await issueRecoverableEbarimt(
      "org-quota",
      "sale",
      async (mark) => {
        mark();
        return fiscal;
      },
      storage,
    ),
    fiscal,
  );
  assert.equal(hasDurableEbarimtPayload("org-quota", "sale", storage), false);
  assert.deepEqual(
    await issueRecoverableEbarimt(
      "org-quota",
      "sale",
      async () => {
        throw new Error("must not issue");
      },
      storage,
    ),
    fiscal,
  );
  acknowledgeEbarimtAttachment("org-quota", "sale", storage);
  assert.equal(storage.length, 0);
});

test("uncertain and corrupt fiscal records remain visible with receipt references across reload", async () => {
  const { listEbarimtRecoveries } =
    await import("./ebarimt-attachment-recovery");
  const storage = memoryStorage();
  await assert.rejects(
    issueRecoverableEbarimt(
      "org-visible",
      "sale",
      async (mark) => {
        mark();
        throw new Error("PosAPI rejected receipt");
      },
      storage,
      "POS-visible",
    ),
  );
  storage.setItem(
    "mglstore.pos.ebarimt-attachment.v1:org-visible:corrupt-sale",
    "invalid JSON",
  );
  const rows = listEbarimtRecoveries("org-visible", storage);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].receiptNo, "POS-visible");
  assert.equal(rows[0].state, "NEEDS_REVIEW");
  assert.equal(rows[0].error, "PosAPI rejected receipt");
  assert.equal(rows[1].saleId, "corrupt-sale");
  assert.equal(rows[1].state, "NEEDS_REVIEW");
  assert.equal(listEbarimtRecoveries("other-org", storage).length, 0);
  assert.equal(storage.length, 2);
});

test("fiscal amount attachment rejection remains visible and stops automatic retries", async () => {
  const { listEbarimtRecoveries } =
    await import("./ebarimt-attachment-recovery");
  const storage = memoryStorage();
  await issueRecoverableEbarimt(
    "org-mismatch",
    "sale",
    async (mark) => {
      mark();
      return fiscal;
    },
    storage,
    "POS-mismatch",
  );
  let calls = 0;
  const attach = async () => {
    calls++;
    throw Object.assign(new Error("Total mismatch"), {
      code: "FISCAL_AMOUNT_MISMATCH",
    });
  };
  await retryEbarimtAttachments("org-mismatch", attach, storage);
  await retryEbarimtAttachments("org-mismatch", attach, storage);
  assert.equal(calls, 1);
  assert.equal(
    listEbarimtRecoveries("org-mismatch", storage)[0].state,
    "NEEDS_REVIEW",
  );
});
