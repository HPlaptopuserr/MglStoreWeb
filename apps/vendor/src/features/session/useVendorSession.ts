"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "@/lib/api";
import {
  clearVendorSessionIfCurrent,
  saveVendorSession,
  VENDOR_TOKEN_KEY,
} from "@/lib/vendor-session-storage";
import {
  loadVendorSession,
  loadVendorSettings,
  switchVendorOrganization,
  VendorSessionExpiredError,
} from "./vendor-session.api";
import {
  canSwitchToOrganization,
  organizationDestination,
  vendorAccessMode,
  type VendorSessionUser,
} from "./vendor-session.model";

type SessionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      user: VendorSessionUser;
      settings: Record<string, unknown>;
    };

function errorMessage(error: unknown) {
  return error instanceof Error && !(error instanceof TypeError)
    ? error.message
    : "Холболт тасарсан байна. Нэвтрэлт хэвээр байгаа тул дахин оролдоно уу.";
}

export function useVendorSession(pathname: string) {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const switchPending = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(VENDOR_TOKEN_KEY);
    if (!token) {
      window.location.replace("/login");
      return;
    }
    const controller = new AbortController();
    async function hydrate(token: string) {
      try {
        const user = await loadVendorSession(
          API_BASE,
          token,
          controller.signal,
        );
        const settings = await loadVendorSettings(API_BASE, controller.signal);
        if (
          controller.signal.aborted ||
          localStorage.getItem(VENDOR_TOKEN_KEY) !== token
        )
          return;
        saveVendorSession(localStorage, token, token, user);
        setState({ status: "ready", user, settings });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (
          error instanceof VendorSessionExpiredError &&
          clearVendorSessionIfCurrent(localStorage, token)
        ) {
          window.location.replace("/login");
          return;
        }
        setState({ status: "error", message: errorMessage(error) });
      }
    }
    void hydrate(token);
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);
  const logout = useCallback(() => {
    clearVendorSessionIfCurrent(
      localStorage,
      localStorage.getItem(VENDOR_TOKEN_KEY),
    );
    window.location.replace("/login");
  }, []);

  async function switchOrganization(organizationId: string) {
    if (
      state.status !== "ready" ||
      switchPending.current ||
      organizationId === state.user.organizationId
    )
      return;
    const target = state.user.organizations.find(
      (item) => item.id === organizationId,
    );
    if (!target || !canSwitchToOrganization(target)) {
      setSwitchError(
        "Сонгосон дэлгүүрт эзэмшигч эсвэл кассын ажилтны эрх шаардлагатай.",
      );
      return;
    }
    const token = localStorage.getItem(VENDOR_TOKEN_KEY);
    if (!token) {
      window.location.replace("/login");
      return;
    }
    switchPending.current = true;
    setSwitching(true);
    setSwitchError(null);
    try {
      const result = await switchVendorOrganization(
        API_BASE,
        token,
        organizationId,
      );
      if (!mounted.current) return;
      saveVendorSession(localStorage, token, result.accessToken, result.user);
      // Navigate to an allowed destination before mounting the new store's pages.
      window.location.replace(organizationDestination(result.mode, pathname));
    } catch (error) {
      if (!mounted.current) return;
      if (
        error instanceof VendorSessionExpiredError &&
        clearVendorSessionIfCurrent(localStorage, token)
      ) {
        window.location.replace("/login");
        return;
      }
      setSwitchError(errorMessage(error));
      setSwitching(false);
      switchPending.current = false;
    }
  }

  const mode =
    state.status === "ready" && state.user.organizationId
      ? vendorAccessMode(state.user.orgRole, state.user.capabilities)
      : null;
  return {
    state,
    mode,
    retry,
    logout,
    switching,
    switchError,
    switchOrganization,
  };
}
