"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

// ─── Types (mirrored from @mgl/types to avoid build-time import issues) ─

export type AdminUser = {
  id: string;
  email: string;
  role: string;
  roleLabel: string;
  fullName: string;
  permissions: string[];
};

export type StoredSession = {
  token: string;
  user: AdminUser;
};

type AuthState = {
  user: AdminUser | null;
  token: string | null;
  isReady: boolean;
};

type AdminAuthContextValue = AuthState & {
  /** Check if the current user has a specific permission */
  hasPermission: (permission: string) => boolean;
  /** Check if user has ANY of the listed permissions */
  hasAnyPermission: (...permissions: string[]) => boolean;
  /** Check if user is SUPER_ADMIN or ADMIN */
  isFullAdmin: boolean;
  /** Get initials for avatar */
  initials: string;
  /** Logout current session */
  logout: () => void;
  /** API fetch with auto-attached auth header */
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  /** All stored sessions (for account switcher) */
  sessions: StoredSession[];
  /** Switch to a different stored session by role */
  switchSession: (role: string) => void;
  /** Remove a specific session by role */
  removeSession: (role: string) => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const SESSIONS_KEY = "admin_sessions";
const ACTIVE_ROLE_KEY = "admin_active_role";

// ─── Backward compat: old single-key → new multi-session ───────────────
const LEGACY_TOKEN_KEY = "admin_token";
const LEGACY_USER_KEY = "admin_user";

function migrateLegacy(): void {
  const token = localStorage.getItem(LEGACY_TOKEN_KEY);
  const userStr = localStorage.getItem(LEGACY_USER_KEY);
  if (!token || !userStr) return;
  try {
    const user = JSON.parse(userStr) as AdminUser;
    if (!user.id || !user.role) return;
    const sessions: StoredSession[] = [{ token, user }];
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    localStorage.setItem(ACTIVE_ROLE_KEY, user.role);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  } catch { /* skip */ }
}

function getSessions(): StoredSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredSession[];
  } catch { return []; }
}

function saveSessions(sessions: StoredSession[]): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function getActiveRole(): string | null {
  return localStorage.getItem(ACTIVE_ROLE_KEY);
}

/** Add or replace a session (keyed by role) */
export function addSession(token: string, user: AdminUser): void {
  migrateLegacy();
  const sessions = getSessions().filter((s) => s.user.role !== user.role);
  sessions.push({ token, user });
  saveSessions(sessions);
  localStorage.setItem(ACTIVE_ROLE_KEY, user.role);
  // Keep legacy keys in sync for adminFetch
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
  localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(user));
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isReady: false,
  });
  const [sessions, setSessions] = useState<StoredSession[]>([]);

  // Hydrate from localStorage
  useEffect(() => {
    migrateLegacy();
    const allSessions = getSessions();
    setSessions(allSessions);

    if (allSessions.length === 0) {
      router.replace("/login");
      return;
    }

    const activeRole = getActiveRole();
    const active = allSessions.find((s) => s.user.role === activeRole) || allSessions[0];

    try {
      if (!active.user.id || !active.user.role) throw new Error("Invalid");
      setState({ user: active.user, token: active.token, isReady: true });
      // Sync legacy keys for adminFetch
      localStorage.setItem(LEGACY_TOKEN_KEY, active.token);
      localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(active.user));
      localStorage.setItem(ACTIVE_ROLE_KEY, active.user.role);
    } catch {
      router.replace("/login");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchSession = useCallback(
    (role: string) => {
      const allSessions = getSessions();
      const target = allSessions.find((s) => s.user.role === role);
      if (!target) return;
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
      localStorage.setItem(LEGACY_TOKEN_KEY, target.token);
      localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(target.user));
      setState({ user: target.user, token: target.token, isReady: true });
    },
    [],
  );

  const removeSession = useCallback(
    (role: string) => {
      const allSessions = getSessions().filter((s) => s.user.role !== role);
      saveSessions(allSessions);
      setSessions(allSessions);

      // If removed the active session, switch to another or logout
      if (state.user?.role === role) {
        if (allSessions.length > 0) {
          switchSession(allSessions[0].user.role);
        } else {
          localStorage.removeItem(ACTIVE_ROLE_KEY);
          localStorage.removeItem(LEGACY_TOKEN_KEY);
          localStorage.removeItem(LEGACY_USER_KEY);
          setState({ user: null, token: null, isReady: false });
          router.push("/login");
        }
      }
    },
    [state.user, switchSession, router],
  );

  const logout = useCallback(() => {
    // Remove current session only
    if (state.user) {
      removeSession(state.user.role);
    } else {
      localStorage.removeItem(SESSIONS_KEY);
      localStorage.removeItem(ACTIVE_ROLE_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      localStorage.removeItem(LEGACY_USER_KEY);
      setState({ user: null, token: null, isReady: false });
      router.push("/login");
    }
  }, [state.user, removeSession, router]);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!state.user) return false;
      return state.user.permissions.includes(permission);
    },
    [state.user],
  );

  const hasAnyPermission = useCallback(
    (...permissions: string[]) => {
      if (!state.user) return false;
      return permissions.some((p) => state.user!.permissions.includes(p));
    },
    [state.user],
  );

  const isFullAdmin = useMemo(
    () =>
      state.user?.role === "SUPER_ADMIN" || state.user?.role === "ADMIN",
    [state.user],
  );

  const initials = useMemo(() => {
    if (!state.user) return "?";
    const name = state.user.fullName || state.user.email;
    const parts = name.split(/[\s@]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [state.user]);

  const authFetch = useCallback(
    async (url: string, init?: RequestInit): Promise<Response> => {
      const headers = new Headers(init?.headers);
      if (state.token) {
        headers.set("Authorization", `Bearer ${state.token}`);
      }
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const res = await fetch(url, { ...init, headers });

      // Auto-logout on 401
      if (res.status === 401) {
        logout();
      }

      return res;
    },
    [state.token, logout],
  );

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      ...state,
      hasPermission,
      hasAnyPermission,
      isFullAdmin,
      initials,
      logout,
      authFetch,
      sessions,
      switchSession,
      removeSession,
    }),
    [state, hasPermission, hasAnyPermission, isFullAdmin, initials, logout, authFetch, sessions, switchSession, removeSession],
  );

  if (!state.isReady) return null;

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used inside <AdminAuthProvider>");
  }
  return ctx;
}
