const directApiBase =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

const browserProxyApiBase =
  process.env.NEXT_PUBLIC_API_PROXY_BASE?.replace(/\/$/, "") ||
  "/api-proxy";

export const API_BASE =
  typeof window !== "undefined" && process.env.NODE_ENV === "production"
    ? browserProxyApiBase
    : directApiBase;

export const API = `${API_BASE}/api`;

export function resolveApiAssetUrl(url?: string | null) {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;

  const normalized = url.startsWith("/") ? url : `/${url}`;
  if (normalized.startsWith("/api/auth/")) {
    return `${API_BASE}${normalized.slice(4)}`;
  }
  return `${API_BASE}${normalized}`;
}
