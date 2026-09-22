"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  API_BASE,
  clearOrgSession,
  getOrgToken,
  OrgUser,
  saveOrgSession,
} from "@/lib/api";

function mergeStoredUser(me: OrgUser) {
  const stored = JSON.parse(localStorage.getItem("org_user") || "{}");
  const user = {
    ...stored,
    ...me,
    organizationName:
      me.organizationName || stored.organizationName || "Байгууллага",
  } as OrgUser;
  localStorage.setItem("org_user", JSON.stringify(user));
  return user;
}

export function useOrgSession() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<OrgUser | null>(null);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState("");

  const logout = useCallback(() => {
    clearOrgSession();
    router.replace("/login");
  }, [router]);

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      if (!user || switching || organizationId === user.organizationId) return;

      const target = user.organizations?.find(
        (organization) => organization.id === organizationId,
      );
      if (!target || (target.status && target.status !== "ACTIVE")) {
        setSwitchError("Сонгосон байгууллагын эрх идэвхгүй байна.");
        return;
      }

      const token = getOrgToken();
      if (!token) {
        logout();
        return;
      }

      setSwitching(true);
      setSwitchError("");
      try {
        const response = await fetch(
          `${API_BASE}/auth/vendor/switch-organization`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ organizationId }),
          },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof payload?.message === "string"
              ? payload.message
              : "Байгууллага солиход алдаа гарлаа.",
          );
        }
        if (!payload?.accessToken || !payload?.user?.organizationId) {
          throw new Error("Байгууллага солих мэдээлэл бүрэн ирсэнгүй.");
        }

        saveOrgSession(payload.accessToken, payload.user as OrgUser);
        window.location.replace("/dashboard");
      } catch (error) {
        setSwitchError(
          error instanceof Error
            ? error.message
            : "Байгууллага солиход алдаа гарлаа.",
        );
        setSwitching(false);
      }
    },
    [logout, switching, user],
  );

  useEffect(() => {
    const token = getOrgToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const hydrate = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Unauthorized");
        const me = (await response.json()) as OrgUser;
        if (!me.organizationId) throw new Error("Missing organization");

        setUser(mergeStoredUser(me));
        setReady(true);
      } catch {
        clearOrgSession();
        router.replace("/login");
      }
    };

    hydrate();
  }, [router]);

  return {
    ready,
    user,
    logout,
    switching,
    switchError,
    switchOrganization,
  };
}
