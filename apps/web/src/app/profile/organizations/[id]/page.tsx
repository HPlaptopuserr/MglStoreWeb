"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth, type AuthOrganization, type AuthUser } from "@/lib/auth-context";
import { ManagedOrganizationProfile } from "../../_components/ManagedOrganizationProfile";
import { ProfileDashboardShell } from "../../_components/ProfileDashboardShell";

function getManagedOrganizations(user: AuthUser): AuthOrganization[] {
  if (Array.isArray(user.organizations) && user.organizations.length > 0) {
    return user.organizations;
  }

  if (!user.organizationId || !user.orgRole) return [];

  return [
    {
      id: user.organizationId,
      name: user.organizationName || "Байгууллага",
      role: user.orgRole,
      isPrimary: true,
    },
  ];
}

export default function ManagedOrganizationPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const activeOrganizationId = decodeURIComponent(String(params.id || ""));

  const organizations = useMemo(
    () => (user ? getManagedOrganizations(user) : []),
    [user],
  );
  const canManageOrganization = organizations.some(
    (organization) => organization.id === activeOrganizationId,
  );

  useEffect(() => {
    if (user) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (!loading && user && !canManageOrganization) {
      router.replace("/profile");
    }
  }, [canManageOrganization, loading, router, user]);

  if (loading || !user || !canManageOrganization) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <ProfileDashboardShell>
      <ManagedOrganizationProfile
        activeOrganizationId={activeOrganizationId}
        organizations={organizations}
        onBackToPersonal={() => router.push("/profile")}
        onSelectOrganization={(organizationId) =>
          router.push(`/profile/organizations/${encodeURIComponent(organizationId)}`)
        }
      />
    </ProfileDashboardShell>
  );
}
