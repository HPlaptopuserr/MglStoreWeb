export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

export const API = `${API_BASE}/api`;

type StoredAdminSession = {
  token?: string;
  user?: {
    role?: string;
  };
};

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;

  const legacyToken = localStorage.getItem("admin_token");
  if (legacyToken) return legacyToken;

  try {
    const rawSessions = localStorage.getItem("admin_sessions");
    if (!rawSessions) return null;

    const sessions = JSON.parse(rawSessions) as StoredAdminSession[];
    if (!Array.isArray(sessions) || sessions.length === 0) return null;

    const activeRole = localStorage.getItem("admin_active_role");
    const activeSession =
      sessions.find((session) => session.user?.role === activeRole) || sessions[0];

    if (activeSession?.token) {
      localStorage.setItem("admin_token", activeSession.token);
      return activeSession.token;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Authenticated fetch for admin app.
 * Automatically attaches Bearer token from localStorage.
 */
export function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const token = getAdminToken();

  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;

  const headers: Record<string, string> = {
    // Only set Content-Type for non-FormData bodies — FormData sets its own boundary
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (init?.headers) {
    const extra =
      init.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : Array.isArray(init.headers)
          ? Object.fromEntries(init.headers)
          : (init.headers as Record<string, string>);
    Object.assign(headers, extra);
  }

  return fetch(input, { ...init, headers, cache: "no-store" });
}

/**
 * Reads API failures without assuming every upstream response is JSON.
 * This keeps proxy/404 HTML responses from surfacing as JSON syntax errors.
 */
export async function getApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json")) {
    const payload: unknown = await response.json().catch(() => null);
    if (
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string"
    ) {
      return payload.message;
    }
  }

  return `${fallback} (HTTP ${response.status})`;
}
