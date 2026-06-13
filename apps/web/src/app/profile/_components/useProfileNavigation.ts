"use client";

import { useEffect } from "react";
import type { AuthUser } from "@/lib/auth-context";
import type { ProfileTab } from "./types";
import { getManagedOrganizations } from "./profileUtils";

type Options = {
  loading: boolean;
  onMembershipOpen: () => void;
  router: { replace: (href: string) => void };
  setTab: (tab: ProfileTab) => void;
  user: AuthUser | null;
};

export function useProfileNavigation({
  loading,
  onMembershipOpen,
  router,
  setTab,
  user,
}: Options) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");

    if (window.location.hash === "#membership-activation") {
      onMembershipOpen();
      window.history.replaceState(null, "", window.location.pathname);
    }
    if (requestedTab && ["profile", "address", "security"].includes(requestedTab)) {
      router.replace(`/profile/settings?section=${requestedTab}`);
      return;
    }
    if (requestedTab === "library" || requestedTab === "orders") {
      setTab(requestedTab);
    }
  }, [onMembershipOpen, router, setTab]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;

    const organizationId = new URLSearchParams(window.location.search).get("org");
    if (!organizationId) return;

    const canManageOrganization = getManagedOrganizations(user).some(
      (organization) => organization.id === organizationId,
    );

    if (canManageOrganization) {
      router.replace(`/profile/organizations/${encodeURIComponent(organizationId)}`);
    }
  }, [router, user]);
}
