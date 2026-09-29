/** Bound network and response-body waits; never retry a financial request here. */
export function paymentProviderFetch(
  input: string | URL | Request,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs);
  return fetch(input, {
    ...init,
    signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
  });
}
