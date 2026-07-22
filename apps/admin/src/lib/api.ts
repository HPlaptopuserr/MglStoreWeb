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

const TOKEN_KEY = "admin_token";
const USER_KEY = "admin_user";
const SESSIONS_KEY = "admin_sessions";
const ACTIVE_ROLE_KEY = "admin_active_role";

function readStoredSessions(): StoredAdminSession[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? "[]");
    return Array.isArray(value) ? (value as StoredAdminSession[]) : [];
  } catch {
    return [];
  }
}

/** Remove only the session whose token the API rejected. */
function invalidateAdminSession(rejectedToken: string): void {
  const sessions = readStoredSessions();
  const validSessions = sessions.filter(
    (session) => session.token && session.token !== rejectedToken,
  );

  localStorage.setItem(SESSIONS_KEY, JSON.stringify(validSessions));

  const legacyToken = localStorage.getItem(TOKEN_KEY);
  if (legacyToken === rejectedToken) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  const activeRole = localStorage.getItem(ACTIVE_ROLE_KEY);
  const activeSession = validSessions.find(
    (session) => session.user?.role === activeRole,
  );
  if (activeSession?.token) return;

  const nextSession = validSessions[0];
  if (nextSession?.token && nextSession.user?.role) {
    localStorage.setItem(ACTIVE_ROLE_KEY, nextSession.user.role);
    localStorage.setItem(TOKEN_KEY, nextSession.token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextSession.user));
    window.location.reload();
    return;
  }

  localStorage.removeItem(ACTIVE_ROLE_KEY);
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;

  const legacyToken = localStorage.getItem(TOKEN_KEY);
  if (legacyToken) return legacyToken;

  try {
    const rawSessions = localStorage.getItem(SESSIONS_KEY);
    if (!rawSessions) return null;

    const sessions = JSON.parse(rawSessions) as StoredAdminSession[];
    if (!Array.isArray(sessions) || sessions.length === 0) return null;

    const activeRole = localStorage.getItem(ACTIVE_ROLE_KEY);
    const activeSession =
      sessions.find((session) => session.user?.role === activeRole) || sessions[0];

    if (activeSession?.token) {
      localStorage.setItem(TOKEN_KEY, activeSession.token);
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

  return fetch(input, { ...init, headers, cache: "no-store" }).then(
    (response) => {
      if (response.status === 401 && token) {
        invalidateAdminSession(token);
      }
      return response;
    },
  );
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
