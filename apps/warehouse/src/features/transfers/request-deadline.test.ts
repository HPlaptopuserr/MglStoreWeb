import assert from "node:assert/strict";
import test from "node:test";
import { withRequestDeadline } from "./request-deadline";
const stalled = (signal: AbortSignal) =>
  new Promise<never>((_, reject) => {
    if (signal.aborted) reject(new Error("cancelled"));
    else
      signal.addEventListener("abort", () => reject(new Error("cancelled")), {
        once: true,
      });
  });
test("an external lifecycle signal does not disable the request timeout", async () => {
  const caller = new AbortController();
  await assert.rejects(
    withRequestDeadline(stalled, caller.signal, 10),
    /Серверийн хариу удаж/,
  );
  assert.equal(caller.signal.aborted, false);
});
test("navigation cancellation is not reported as a timeout", async () => {
  const caller = new AbortController();
  const pending = withRequestDeadline(stalled, caller.signal, 1000);
  caller.abort();
  await assert.rejects(pending, /cancelled/);
});
test("success cleans up its timer without aborting the completed request", async () => {
  let requestSignal: AbortSignal | undefined;
  assert.equal(
    await withRequestDeadline(
      async (signal) => {
        requestSignal = signal;
        return 42;
      },
      undefined,
      10,
    ),
    42,
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(requestSignal?.aborted, false);
});
