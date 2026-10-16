/** Keep caller cancellation and a network deadline independent, including response body reads. */
export async function withRequestDeadline<T>(
  run: (signal: AbortSignal) => Promise<T>,
  caller?: AbortSignal | null,
  timeoutMs = 15_000,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  if (caller?.aborted) cancel();
  else caller?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await run(controller.signal);
  } catch (error) {
    if (timedOut && !caller?.aborted) {
      throw new Error(
        "Серверийн хариу удаж байна. Дахин ачаалах товчийг дарна уу.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
    caller?.removeEventListener("abort", cancel);
  }
}
