import assert from "node:assert/strict";
import test from "node:test";
import { pollCardPayment } from "./poll-card-payment";

const flush = async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); };

test("late card approval after two minutes finishes without another authorization", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let checks = 0;
  const watcher = pollCardPayment(async () => ++checks === 155);
  await flush();
  for (let i = 0; i < 160; i += 1) {
    t.mock.timers.tick(3_000);
    await flush();
  }
  assert.equal(checks, 155);
  watcher.refresh();
  assert.equal(checks, 155, "completed payments are never checked again");
});

test("network errors retry the same payment and a focus event cannot overlap requests", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let checks = 0;
  let resolve: ((done: boolean) => void) | undefined;
  const watcher = pollCardPayment(async () => {
    checks += 1;
    if (checks === 1) throw new Error("offline");
    return new Promise<boolean>(done => { resolve = done; });
  });
  await flush();
  t.mock.timers.tick(6_000);
  await flush();
  assert.equal(checks, 2);
  watcher.refresh();
  watcher.refresh();
  assert.equal(checks, 2);
  resolve?.(true);
  await flush();
  t.mock.timers.tick(60_000);
  assert.equal(checks, 2);
});

test("unmount cancels future retries even when an in-flight check finishes later", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let checks = 0;
  let resolve: ((done: boolean) => void) | undefined;
  const watcher = pollCardPayment(() => {
    checks += 1;
    return new Promise<boolean>(done => { resolve = done; });
  });
  watcher.stop();
  resolve?.(false);
  await flush();
  t.mock.timers.tick(60_000);
  watcher.refresh();
  assert.equal(checks, 1);
});
