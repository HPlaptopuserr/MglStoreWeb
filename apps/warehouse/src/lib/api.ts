const DEFAULT_API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://api.mglstore.mn"
    : "http://localhost:4000";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  DEFAULT_API_BASE;

export const API = `${API_BASE}/api`;

const PRODUCTION_API_BASE = "https://api.mglstore.mn";

function createRequestSignal(signal?: AbortSignal | null) {
  return signal ?? AbortSignal.timeout(15_000);
}

/** Fetch wrapper that auto-attaches the WMS auth token */
export async function wmsFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("wms_token")
      : null;
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

    if (!canUseDevelopmentFallback) throw error;

    const fallbackUrl = inputUrl.replace(
      "http://localhost:4000",
      PRODUCTION_API_BASE,
    );
    res = await fetch(fallbackUrl, {
      ...init,
      headers,
      signal: createRequestSignal(),
    });
  }
  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("wms_token");
    localStorage.removeItem("wms_user");
    window.location.replace("/login");
  }
  return res;
}
