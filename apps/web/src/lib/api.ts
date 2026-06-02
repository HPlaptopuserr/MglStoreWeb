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
