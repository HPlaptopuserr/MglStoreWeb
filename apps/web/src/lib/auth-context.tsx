"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API_BASE } from "./api";

export type AuthUser = {
  id: string;
  email: string | null;
  role: string;
  fullName?: string;
  phone?: string | null;
  orgRole?: string | null;
  organizationId?: string | null;
};

export type VerifyMnMode = "login" | "register";

export type VerifyMnSession = {
  sessionId: string;
  phone: string;
  shortcode: string;
  text: string;
  smsUri: string;
  displayInstruction: string;
  expiresAt: string;
};

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (fullName: string, identifier: string, password: string) => Promise<void>;
  startVerifyMn: (mode: VerifyMnMode, identifier: string, password: string, fullName?: string) => Promise<VerifyMnSession>;
  completeVerifyMn: (mode: VerifyMnMode, identifier: string, password: string, sessionId: string, fullName?: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<AuthUser>) => void;
  refreshUser: () => Promise<void>;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_TOKEN_KEY = "mgl_web_access_token";
const AUTH_USER_KEY = "mgl_web_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AuthUser;
        if (parsed?.id) setUser(parsed);
      } catch {
        localStorage.removeItem(AUTH_USER_KEY);
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    }
    setLoading(false);
  }, []);

  // Sync user to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  }, [user]);

  const authFetch = useCallback(async (url: string, init?: RequestInit): Promise<Response> => {
    const token = getToken();
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("Content-Type") && init?.body) {
      headers.set("Content-Type", "application/json");
    }
    const res = await fetch(url, { ...init, headers });
    if (res.status === 401) {
      // Token expired — auto logout
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      setUser(null);
    }
    return res;
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const isEmail = identifier.includes("@");
    const payload = isEmail
      ? { email: identifier.trim(), password: password.trim() }
      : { phone: identifier.trim(), password: password.trim() };

    const res = await fetch(`${API_BASE}/auth/web/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Нэвтрэхэд алдаа гарлаа.");

    localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken || "");
    setUser(data.user || null);
  }, []);

  const register = useCallback(async (fullName: string, identifier: string, password: string) => {
    const isEmail = identifier.includes("@");
    const payload = isEmail
      ? { email: identifier.trim(), password: password.trim(), fullName: fullName.trim() }
      : { phone: identifier.trim(), password: password.trim(), fullName: fullName.trim() };

    const res = await fetch(`${API_BASE}/auth/web/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Бүртгүүлэхэд алдаа гарлаа.");

    localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken || "");
    setUser(data.user || null);
  }, []);

  const startVerifyMn = useCallback(
    async (mode: VerifyMnMode, identifier: string, password: string, fullName?: string): Promise<VerifyMnSession> => {
      const payload = {
        mode,
        phone: identifier.trim(),
        password: password.trim(),
        fullName: fullName?.trim(),
      };

      const res = await fetch(`${API_BASE}/auth/web/verify-mn/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Verify.mn баталгаажуулалт эхлүүлэхэд алдаа гарлаа.");
      return data;
    },
    [],
  );

  const completeVerifyMn = useCallback(
    async (mode: VerifyMnMode, identifier: string, password: string, sessionId: string, fullName?: string) => {
      const res = await fetch(`${API_BASE}/auth/web/verify-mn/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          phone: identifier.trim(),
          password: password.trim(),
          fullName: fullName?.trim(),
          sessionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Verify.mn баталгаажуулахад алдаа гарлаа.");

      localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken || "");
      setUser(data.user || null);
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setUser(null);
  }, []);

  const updateUser = useCallback((data: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch {
      // silent fail
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, startVerifyMn, completeVerifyMn, logout, updateUser, refreshUser, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
