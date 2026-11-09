import type { CardAttempt } from "./pos";

export const MINU_CARD_WAIT_MS = 30_000;

export function cardPaymentSecondsRemaining(deadline: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((deadline - now) / 1_000));
}

export class CardPaymentWaitExpired extends Error {
  constructor() {
    super("Картын хариу хүлээх 30 секунд дууслаа. Төлбөрийн эцсийн хариуг шалгаж байна.");
    this.name = "CardPaymentWaitExpired";
  }
}

/** Stop waiting locally. Aborting HTTP never means cancelling the bank payment. */
export function withCardPaymentDeadline<T>(
  request: (signal: AbortSignal) => Promise<T>,
  deadline: number,
  callerSignal: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let finished = false;
    const cleanup = () => {
      if (timer !== undefined) clearTimeout(timer);
      callerSignal.removeEventListener("abort", abortFromCaller);
    };
    const fail = (error: unknown) => {
      if (finished) return;
      finished = true;
      cleanup();
      controller.abort();
      reject(error);
    };
    const abortFromCaller = () => fail(callerSignal.reason ?? new Error("Card wait interrupted"));
    if (callerSignal.aborted) { abortFromCaller(); return; }
    const remaining = deadline - Date.now();
    if (remaining <= 0) { fail(new CardPaymentWaitExpired()); return; }
    callerSignal.addEventListener("abort", abortFromCaller, { once: true });
    timer = setTimeout(() => fail(new CardPaymentWaitExpired()), remaining);
    Promise.resolve().then(() => {
      if (finished) return;
      return request(controller.signal).then(result => {
        if (finished) return;
        if (Date.now() >= deadline) { fail(new CardPaymentWaitExpired()); return; }
        finished = true;
        cleanup();
        resolve(result);
      });
    }).catch(fail);
  });
}

/** All inquiries use the original invoice and the original visible deadline. */
export async function waitForMinuCardPayment(input: {
  attempt: CardAttempt;
  deadline: number;
  signal: AbortSignal;
  getStatus: (attemptId: string, signal: AbortSignal) => Promise<CardAttempt>;
  onStatus?: (attempt: CardAttempt) => void;
}): Promise<CardAttempt> {
  let attempt = input.attempt;
  while (attempt.status === "PENDING" && Date.now() < input.deadline) {
    await new Promise<void>(resolve => setTimeout(resolve, Math.min(800, input.deadline - Date.now())));
    if (input.signal.aborted) throw input.signal.reason ?? new Error("Card wait interrupted");
    if (Date.now() >= input.deadline) break;
    try {
      attempt = await withCardPaymentDeadline(
        signal => input.getStatus(input.attempt.attemptId, signal),
        Math.min(input.deadline, Date.now() + 12_000),
        input.signal,
      );
    } catch (error: unknown) {
      if (input.signal.aborted) throw error;
      // A lost inquiry cannot decline the payment or extend the original wait.
      continue;
    }
    if (attempt.attemptId !== input.attempt.attemptId) {
      throw new Error("Картын төлбөрийн хүсэлтийн дугаар зөрүүтэй байна.");
    }
    input.onStatus?.(attempt);
  }
  return attempt;
}
