"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  API_BASE,
  clearOrgSession,
  getOrgToken,
  OrgUser,
} from "@/lib/api";

function mergeStoredUser(me: OrgUser) {
  const stored = JSON.parse(localStorage.getItem("org_user") || "{}");
  const user = {
    ...stored,
    ...me,
    organizationName:
      stored.organizationName || me.organizationName || "Байгууллага",
  } as OrgUser;
  localStorage.setItem("org_user", JSON.stringify(user));
  return user;
}

export function useOrgSession() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<OrgUser | null>(null);

  const logout = useCallback(() => {
    clearOrgSession();
    router.replace("/login");
  }, [router]);

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

  return { ready, user, logout };
}
