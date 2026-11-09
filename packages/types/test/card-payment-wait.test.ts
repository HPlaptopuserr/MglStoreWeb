import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import type { CardAttempt } from "../src/domain/pos";
import { MINU_CARD_WAIT_MS, CardPaymentWaitExpired, cardPaymentSecondsRemaining,
  waitForMinuCardPayment, withCardPaymentDeadline } from "../src/domain/card-payment-wait";

const pending: CardAttempt = { attemptId: "original-invoice", amount: 19000, terminalId: "terminal",
  status: "PENDING", createdAt: "2026-11-10T00:00:00Z", updatedAt: "2026-11-10T00:00:00Z" };
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
const advance = async (t: TestContext, ms: number) => {
  for (let passed = 0; passed < ms; passed += 100) {
    t.mock.timers.tick(Math.min(100, ms - passed));
    await flush();
  }
};

test("visible countdown uses elapsed wall time, including a suspended tab", () => {
  const deadline = 1000 + MINU_CARD_WAIT_MS;
  assert.equal(cardPaymentSecondsRemaining(deadline, 1000), 30);
  assert.equal(cardPaymentSecondsRemaining(deadline, 2000), 29);
  assert.equal(cardPaymentSecondsRemaining(deadline, 30500), 1);
  assert.equal(cardPaymentSecondsRemaining(deadline, 31000), 0);
  assert.equal(cardPaymentSecondsRemaining(deadline, 90000), 0);
});

test("a hanging authorization stops at 30 seconds and ignores its late reply", async t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  let requestSignal: AbortSignal | undefined;
  let reply: ((attempt: CardAttempt) => void) | undefined;
  let applied = 0;
  const request = withCardPaymentDeadline(signal => {
    requestSignal = signal;
    return new Promise<CardAttempt>(resolve => { reply = resolve; });
  }, MINU_CARD_WAIT_MS, new AbortController().signal).then(attempt => { applied++; return attempt; });
  const rejected = assert.rejects(request, CardPaymentWaitExpired);
  await flush();
  await advance(t, 29999);
  assert.equal(requestSignal?.aborted, false);
  await advance(t, 1);
  await rejected;
  assert.equal(requestSignal?.aborted, true);
  reply?.({ ...pending, status: "APPROVED" });
  await flush();
  assert.equal(applied, 0, "late HTTP replies cannot update another customer's checkout");
});

test("authorization and repeated slow inquiries share one 30-second budget", async t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  const deadline = MINU_CARD_WAIT_MS;
  const authorization = withCardPaymentDeadline(() => new Promise<CardAttempt>(resolve => {
    setTimeout(() => resolve(pending), 10_000);
  }), deadline, new AbortController().signal);
  await flush();
  await advance(t, 10_000);
  const attempt = await authorization;
  const invoices: string[] = [];
  let settled = false;
  const result = waitForMinuCardPayment({ attempt, deadline, signal: new AbortController().signal,
    getStatus: (id, signal) => {
      invoices.push(id);
      return new Promise<CardAttempt>((_, reject) => {
        signal.addEventListener("abort", () => reject(new Error("network unavailable")), { once: true });
      });
    },
  }).then(value => { settled = true; return value; });
  await advance(t, 19999);
  assert.equal(settled, false);
  await advance(t, 1);
  assert.equal(await result, pending);
  assert.equal(Date.now(), 30_000);
  assert.ok(invoices.length >= 2);
  assert.ok(invoices.every(id => id === pending.attemptId));
  assert.equal(pending.status, "PENDING", "timeout never fabricates bank cancellation");
});

test("temporary inquiry failure retries the same invoice and accepts a final approval", async t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  let checks = 0;
  const received: CardAttempt[] = [];
  const result = waitForMinuCardPayment({ attempt: pending, deadline: MINU_CARD_WAIT_MS,
    signal: new AbortController().signal, onStatus: attempt => received.push(attempt),
    getStatus: async id => {
      assert.equal(id, pending.attemptId);
      if (++checks === 1) throw new Error("offline");
      return { ...pending, status: "APPROVED" };
    },
  });
  await advance(t, 1600);
  assert.equal((await result).status, "APPROVED");
  assert.equal(checks, 2);
  assert.equal(received.length, 1);
});

test("confirmed cancellation returns immediately without issuing another payment", async t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  let checks = 0;
  const result = waitForMinuCardPayment({ attempt: pending, deadline: MINU_CARD_WAIT_MS,
    signal: new AbortController().signal,
    getStatus: async () => { checks++; return { ...pending, status: "DECLINED", message: "Цуцлагдлаа" }; },
  });
  await advance(t, 800);
  assert.equal((await result).status, "DECLINED");
  await advance(t, 30_000);
  assert.equal(checks, 1);
});

test("leaving a run aborts its inquiry and cannot start a replacement request", async t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  const caller = new AbortController();
  let signal: AbortSignal | undefined;
  const request = withCardPaymentDeadline(value => {
    signal = value;
    return new Promise<never>(() => {});
  }, MINU_CARD_WAIT_MS, caller.signal);
  const rejected = assert.rejects(request, /left checkout/);
  await flush();
  caller.abort(new Error("left checkout"));
  await rejected;
  assert.equal(signal?.aborted, true);
});

test("an already expired deadline never sends a request", async () => {
  let requests = 0;
  await assert.rejects(withCardPaymentDeadline(async () => { requests++; return pending; },
    Date.now() - 1, new AbortController().signal), CardPaymentWaitExpired);
  assert.equal(requests, 0);
});
