import { clearVendorSessionIfCurrent } from "./vendor-session-storage";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

export const API = `${API_BASE}/api`;

/** Fetch wrapper that auto-attaches the vendor auth token */
export async function authFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("vendor_token") : null;
  const headers = new Headers(init?.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // Only set Content-Type for string bodies — FormData sets its own boundary
  if (
    !headers.has("Content-Type") &&
    init?.body &&
    typeof init.body === "string"
  ) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(input, { ...init, headers });
  const authorization = headers.get("Authorization");
  const requestToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;
  if (
    res.status === 401 &&
    typeof window !== "undefined" &&
    clearVendorSessionIfCurrent(localStorage, requestToken)
  ) {
    window.location.replace("/login");
  }
  return res;
}
