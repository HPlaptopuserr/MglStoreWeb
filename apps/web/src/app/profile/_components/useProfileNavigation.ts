"use client";

import { useEffect } from "react";
import type { AuthUser } from "@/lib/auth-context";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { getManagedOrganizations } from "./profileUtils";

type Options = {
  loading: boolean;
  onMembershipOpen: () => void;
  router: { replace: (href: string) => void };
  user: AuthUser | null;
};

export function useProfileNavigation({
  loading,
  onMembershipOpen,
  router,
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
    if (requestedTab === "orders") {
      router.replace(ACCOUNT_ROUTES.orders);
      return;
    }
    if (requestedTab === "profile") {
      router.replace(ACCOUNT_ROUTES.profileInfo);
      return;
    }
    if (requestedTab === "address") {
      router.replace(ACCOUNT_ROUTES.profileAddress);
      return;
    }
    if (requestedTab === "security") {
      router.replace(ACCOUNT_ROUTES.profileSecurity);
    }
  }, [onMembershipOpen, router]);

  useEffect(() => {
    if (!loading && !user) router.replace(ACCOUNT_ROUTES.login);
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
