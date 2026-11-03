import { setTimeout as delay } from "node:timers/promises";

function connectionWasClosed(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && error.code === "P1017") return true;
  return "message" in error && typeof error.message === "string" &&
    /server has closed the connection|connection reset by peer/i.test(error.message);
}

/** Only use for standalone reads: never retry a write, payment, or transaction. */
export async function retryDisconnectedRead<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error: unknown) {
    if (!connectionWasClosed(error)) throw error;
    // Let Prisma replace a closed pooled connection without disconnecting other requests.
    await delay(250);
    return read();
  }
}
