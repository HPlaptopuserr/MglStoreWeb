import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AttachEbarimtPayload } from "../api/ebarimt";
import type { PosReceipt } from "../types/receipt.types";
import { issueClaimedQrFiscalReceipt } from "./qr-fiscal-recovery";
import type { EbarimtRecoveryMemory } from "./ebarimt-attachment-recovery";

const receipt: PosReceipt = { id: "sale", receiptNo: "receipt", branchName: "Branch", cashierName: "Cashier",
  paymentMethod: "QR", createdAt: new Date().toISOString(), lines: [],
  subTotal: 100, taxTotal: 0, discountTotal: 0, grandTotal: 100 };
const payload: AttachEbarimtPayload = { status: "SUCCESS", billId: "fiscal-receipt", receiptType: "B2C" };
const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const tails = new Map<string, Promise<void>>();
const locks = { async request<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const previous = tails.get(name) ?? Promise.resolve();
  let release: () => void = () => {};
  const current = new Promise<void>(resolve => { release = resolve; });
  tails.set(name, previous.then(() => current));
  await previous;
  try { return await operation(); } finally { release(); }
} };
before(() => Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks } }));
after(() => { if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator); else Reflect.deleteProperty(globalThis, "navigator"); });
function memory(): EbarimtRecoveryMemory { return { inFlight: new Map(), issuedInMemory: new Map() }; }
function storageMock(): Storage {
  const values = new Map<string, string>();
  return { get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); }, clear: () => values.clear() };
}

test("isolated active and reconnect tabs share one Web Lock and one fiscal mutation", async () => {
  const storage = storageMock();
  let claimCalls = 0;
  let mutationCalls = 0;
  let started: () => void = () => {};
  const issuing = new Promise<void>(resolve => { started = resolve; });
  let complete: () => void = () => {};
  const completed = new Promise<void>(resolve => { complete = resolve; });
  const input = { organizationId: "concurrent-org", invoiceId: "invoice", receipt, storage,
    claim: async (invoiceId: string, saleId: string, requestId: string) => {
      claimCalls += 1; assert.equal(invoiceId, "invoice"); assert.equal(saleId, "sale"); assert.ok(requestId);
      return { claimed: true, resumed: false };
    },
    issue: async (beforeDispatch: () => Promise<void>) => { await beforeDispatch(); mutationCalls += 1; started(); await completed; return payload; },
  };
  // These maps model separate browser module instances. Only shared lock/storage
  // can prevent the second tab from claiming and issuing another receipt.
  const activeMemory = memory();
  const queueMemory = memory();
  const activeCheckout = issueClaimedQrFiscalReceipt({ ...input, memory: activeMemory });
  const reconnectQueue = issueClaimedQrFiscalReceipt({ ...input, memory: queueMemory });
  await issuing;
  assert.equal(claimCalls, 1);
  complete();
  assert.deepEqual(await Promise.all([activeCheckout, reconnectQueue]), [payload, payload]);
  assert.equal(claimCalls, 1);
  assert.equal(mutationCalls, 1);
  assert.deepEqual(await issueClaimedQrFiscalReceipt({ ...input, memory: memory() }), payload);
  assert.equal(claimCalls, 1);
  assert.equal(mutationCalls, 1);
});

test("uncertain PosAPI response keeps its dispatch marker and cannot issue again", async () => {
  const storage = storageMock();
  let calls = 0;
  const input = { organizationId: "uncertain-org", invoiceId: "invoice", receipt, storage,
    claim: async () => ({ claimed: true, resumed: false }),
    issue: async (beforeDispatch: () => Promise<void>): Promise<AttachEbarimtPayload> => { await beforeDispatch(); calls += 1; throw new Error("Response lost"); },
  };
  await assert.rejects(issueClaimedQrFiscalReceipt({ ...input, memory: memory() }), /Response lost/);
  await assert.rejects(issueClaimedQrFiscalReceipt({ ...input, memory: memory() }), /хариу тодорхойгүй/);
  assert.equal(calls, 1);
});

test("a foreign or ambiguous resumed server claim never calls the local mutation", async () => {
  for (const resumed of [false, true]) {
    let mutationCalls = 0;
    await assert.rejects(issueClaimedQrFiscalReceipt({ organizationId: `foreign-claim-org-${resumed}`, invoiceId: "invoice", receipt, storage: storageMock(),
      claim: async () => { if (!resumed) throw new Error("Claim already owned"); return { claimed: true, resumed: true }; },
      issue: async beforeDispatch => { await beforeDispatch(); mutationCalls += 1; return payload; },
    }), resumed ? /local төлөв олдсонгүй/ : /Claim already owned/);
    assert.equal(mutationCalls, 0);
  }
});

test("a successful server fiscal receipt is reused without local issuance", async () => {
  let mutationCalls = 0;
  const result = await issueClaimedQrFiscalReceipt({ organizationId: "issued-org", invoiceId: "invoice", receipt, storage: storageMock(),
    claim: async () => ({ alreadyIssued: true, receipt: { ...receipt, ebarimt: payload } }),
    issue: async beforeDispatch => { await beforeDispatch(); mutationCalls += 1; return payload; },
  });
  assert.equal(result.status, "SUCCESS");
  assert.equal(result.billId, "fiscal-receipt");
  assert.equal(mutationCalls, 0);
});

test("read-only PosAPI preflight can fail and recover before any exclusive server claim", async () => {
  const requestIds: string[] = [];
  const storage = storageMock();
  let preparationCalls = 0;
  const input = { organizationId: "pre-dispatch-org", invoiceId: "invoice", receipt, storage,
    claim: async (_invoiceId: string, _saleId: string, requestId: string) => { requestIds.push(requestId); return { claimed: true, resumed: false }; },
    issue: async (beforeDispatch: () => Promise<void>) => {
      preparationCalls += 1;
      if (preparationCalls === 1) throw new Error("PosAPI unavailable before dispatch");
      await beforeDispatch(); return payload;
    },
  };
  await assert.rejects(issueClaimedQrFiscalReceipt(input), /before dispatch/);
  assert.equal(requestIds.length, 0);
  await issueClaimedQrFiscalReceipt(input);
  assert.equal(requestIds.length, 1);
});

test("unsupported Web Locks fail closed for a new fiscal request but may attach cached READY proof", async () => {
  const storage = storageMock();
  const organizationId = "unsupported-org";
  let calls = 0;
  const input = { organizationId, invoiceId: "invoice", receipt, storage,
    claim: async () => { calls += 1; return { claimed: true }; },
    issue: async () => { calls += 1; return payload; },
  };
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: {} });
  try {
    await assert.rejects(issueClaimedQrFiscalReceipt(input), /түгжээг дэмжихгүй/);
    assert.equal(calls, 0);
    storage.setItem(`mglstore.pos.ebarimt-attachment.v1:${organizationId}:sale`, JSON.stringify({ state: "READY", payload }));
    assert.deepEqual(await issueClaimedQrFiscalReceipt(input), payload);
    assert.equal(calls, 0);
  } finally { Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks } }); }
});
