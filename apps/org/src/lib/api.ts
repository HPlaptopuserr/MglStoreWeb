export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

export const API = `${API_BASE}/api`;

export type OrgUser = {
  id: string;
  email?: string | null;
  fullName?: string | null;
  phone?: string | null;
  role?: string | null;
  orgRole?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
};

export function getStoredOrgUser(): OrgUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("org_user");
    return raw ? (JSON.parse(raw) as OrgUser) : null;
  } catch {
    return null;
  }
}

export function getOrgToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("org_token");
}

export function clearOrgSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("org_token");
  window.localStorage.removeItem("org_user");
}

export function saveOrgSession(token: string, user: OrgUser) {
  window.localStorage.setItem("org_token", token);
  window.localStorage.setItem("org_user", JSON.stringify(user));
}

export async function authFetch(input: string | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const token = getOrgToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && init?.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && typeof window !== "undefined") {
    clearOrgSession();
    window.location.href = "/login";
  }

  return response;
}
