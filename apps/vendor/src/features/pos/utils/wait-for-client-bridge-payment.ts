import type { CardAttempt } from "@mgl/types";

type Options = {
  attempt: CardAttempt;
  signal: AbortSignal;
  charge: () => Promise<CardAttempt>;
  getStatus: (attemptId: string, signal: AbortSignal) => Promise<CardAttempt>;
  intervalMs?: number;
  waitMs?: number;
};

/** A journal result may arrive before the original HTTP response. Never dispatch
 * another purchase, abort the financial operation, or infer cancellation from a
 * transport failure. Late responses cannot change the returned terminal result. */
export function waitForClientBridgePayment({
  attempt,
  signal,
  charge,
  getStatus,
  intervalMs = 1_000,
  waitMs = 140_000,
}: Options): Promise<CardAttempt> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
    const reads = new AbortController();
    const cleanup = () => {
      clearTimeout(pollTimer);
      clearTimeout(deadlineTimer);
      reads.abort();
      signal.removeEventListener("abort", abort);
    };
    const finish = (result: CardAttempt) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    const uncertain = () =>
      finish({
        ...attempt,
        status: "PENDING",
        message:
          "Терминалын эцсийн хариу баталгаажаагүй. Төлсөн бол дахин карт уншуулахгүй, төлөвөө шалгана уу.",
      });
    const abort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(signal.reason || new DOMException("Aborted", "AbortError"));
    };
    const poll = async () => {
      if (settled) return;
      try {
        const result = await getStatus(
          attempt.attemptId,
          AbortSignal.any([reads.signal, AbortSignal.timeout(5_000)]),
        );
        if (
          result.attemptId === attempt.attemptId &&
          (result.status === "APPROVED" || result.status === "DECLINED")
        )
          finish(result);
      } catch {
        /* A failed status read is not a terminal decision. */
      } finally {
        if (!settled) pollTimer = setTimeout(() => void poll(), intervalMs);
      }
    };

    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    deadlineTimer = setTimeout(uncertain, waitMs);
    pollTimer = setTimeout(() => void poll(), intervalMs);
    // Keep this operation alive when a read wins the race. Its eventual API
    // submission is idempotent; only read requests are aborted by cleanup.
    void (async () => {
      try {
        const result = await charge();
        if (settled) return;
        if (result.attemptId !== attempt.attemptId) {
          uncertain();
          return;
        }
        finish(
          result.status === "APPROVED" || result.status === "DECLINED"
            ? result
            : { ...result, status: "PENDING" },
        );
      } catch {
        if (!settled) uncertain();
      }
    })();
  });
}

/** Resolve a cached terminal decision before sending cancellation to hardware. */
export async function cancelPendingClientBridgePayment({
  attemptId,
  getStatus,
  cancel,
}: {
  attemptId: string;
  getStatus: (attemptId: string) => Promise<CardAttempt>;
  cancel: () => Promise<void>;
}): Promise<CardAttempt> {
  const current = await getStatus(attemptId);
  if (current.attemptId !== attemptId)
    throw new Error(
      "Төлбөрийн хүсэлт зөрсөн тул цуцлахгүй. Төлөвөө шалгана уу.",
    );
  if (current.status === "APPROVED" || current.status === "DECLINED")
    return current;
  await cancel();
  const result = await getStatus(attemptId);
  if (result.attemptId !== attemptId)
    throw new Error(
      "Төлбөрийн хүсэлт зөрсөн тул төлөвийг баталгаажуулах боломжгүй.",
    );
  return result;
}
