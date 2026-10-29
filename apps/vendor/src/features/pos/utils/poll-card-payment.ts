/** Serial checks continue through delayed approval and transient network failures. */
export function pollCardPayment(
  check: () => Promise<boolean>,
  intervalMs = 3_000,
): { refresh: () => void; stop: () => void } {
  let stopped = false;
  let inFlight = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  const refresh = () => {
    if (stopped || inFlight) return;
    clearTimeout(timer);
    inFlight = true;
    void (async () => {
      try {
        if (await check()) stopped = true;
        failures = 0;
      } catch {
        failures += 1;
      } finally {
        inFlight = false;
        if (!stopped) timer = setTimeout(refresh, Math.min(30_000, intervalMs * 2 ** Math.min(failures, 4)));
      }
    })();
  };
  refresh();
  return {
    refresh,
    stop: () => { stopped = true; clearTimeout(timer); },
  };
}
