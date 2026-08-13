const DEFAULT_API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://api.mglstore.mn"
    : "http://localhost:4000";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || DEFAULT_API_BASE;

export const API = `${API_BASE}/api`;

const PRODUCTION_API_BASE = "https://api.mglstore.mn";

function createRequestSignal(signal?: AbortSignal | null) {
  return signal ?? AbortSignal.timeout(15_000);
}

function isAbortedRequest(error: unknown, signal?: AbortSignal | null) {
  return (
    signal?.aborted === true ||
    (error instanceof DOMException && error.name === "AbortError")
  );
}

/** Fetch wrapper that auto-attaches the WMS auth token */
export async function wmsFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("wms_token") : null;
  const headers = new Headers(init?.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (
    !headers.has("Content-Type") &&
    init?.body &&
    typeof init.body === "string"
  ) {
    headers.set("Content-Type", "application/json");
  }
  const method = init?.method?.toUpperCase() ?? "GET";
  const inputUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const canUseDevelopmentFallback =
    process.env.NODE_ENV !== "production" &&
    method === "GET" &&
    inputUrl.startsWith("http://localhost:4000/");
  const requestProductionFallback = () => {
    const fallbackUrl = inputUrl.replace(
      "http://localhost:4000",
      PRODUCTION_API_BASE,
    );
    return fetch(fallbackUrl, {
      ...init,
      headers,
      signal: createRequestSignal(init?.signal),
    });
  };
  const request = () =>
    fetch(input, {
      ...init,
      headers,
      signal: createRequestSignal(init?.signal),
    });

  let res: Response;
  try {
    res = await request();
  } catch (error) {
    // A caller abort is an intentional lifecycle event (navigation, changing a
    // selected warehouse, or a newer search). It must never trigger a request
    // to a different backend.
    if (!canUseDevelopmentFallback || isAbortedRequest(error, init?.signal)) {
      throw error;
    }
    res = await requestProductionFallback();
  }
  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("wms_token");
    localStorage.removeItem("wms_user");
    window.location.replace("/login");
  }
  return res;
}
