export type JsonObject = Record<string, unknown>;
export type Fetcher = typeof fetch;

export function object(value: unknown): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Supplier returned an invalid object");
  }
  return value as JsonObject;
}

/** Never expose supplier bodies, headers or credentials in errors. */
export async function requestJson(
  fetcher: Fetcher,
  url: string,
  init: RequestInit,
): Promise<unknown> {
  const response = await fetcher(url, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Supplier HTTP ${response.status}`);
  return response.json() as Promise<unknown>;
}
