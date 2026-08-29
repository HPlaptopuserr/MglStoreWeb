const directApiBase =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

const browserProxyApiBase =
  process.env.NEXT_PUBLIC_API_PROXY_BASE?.replace(/\/$/, "");

export const API_BASE =
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "production" &&
  browserProxyApiBase
    ? browserProxyApiBase
    : directApiBase;

export const API = `${API_BASE}/api`;

/** Authenticated fetch used by shared merchant-setting components. */
export async function authFetch(url: string | URL | Request, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = typeof window !== "undefined" ? localStorage.getItem("mgl_web_access_token") : null;
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && typeof init?.body === "string") headers.set("Content-Type", "application/json");
  return fetch(url, { ...init, headers });
}

export function resolveApiAssetUrl(url?: string | null) {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;

  const normalized = url.startsWith("/") ? url : `/${url}`;
  if (normalized.startsWith("/api/auth/")) {
    return `${API_BASE}${normalized.slice(4)}`;
  }
  return `${API_BASE}${normalized}`;
}
