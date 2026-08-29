"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock3, Loader2 } from "lucide-react";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { useAuth } from "@/lib/auth-context";
import { ManagedOrganizationProfile } from "../../_components/ManagedOrganizationProfile";
import { ProfileDashboardShell } from "../../_components/ProfileDashboardShell";
import { getManagedOrganizations } from "../../_components/profileUtils";
import { VENDOR_BANK_ACCOUNT_URL } from "@/lib/portal-links";

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
  const activeOrganization = organizations.find(
    (organization) => organization.id === activeOrganizationId,
  );

  useEffect(() => {
    if (user) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace(ACCOUNT_ROUTES.login);
  }, [loading, router, user]);

  useEffect(() => {
    if (!loading && user && !canManageOrganization) {
      router.replace(ACCOUNT_ROUTES.profile);
    }
  }, [canManageOrganization, loading, router, user]);

  if (loading || !user || !canManageOrganization) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (activeOrganization?.status === "PENDING") {
    return (
      <ProfileDashboardShell bankAccountHref={VENDOR_BANK_ACCOUNT_URL}>
        <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
            <Clock3 className="h-4 w-4" />
            Pending
          </div>
          <h1 className="mt-4 text-2xl font-black text-slate-950">
            {activeOrganization.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
            Энэ байгууллага хоёр дахь гишүүний баталгаажуулалт хүлээж байна.
            Батлагдсаны дараа dashboard болон sensitive action-ууд нээгдэнэ.
          </p>
          <button
            type="button"
            onClick={() => router.push(ACCOUNT_ROUTES.profile)}
            className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200"
          >
            Personal profile руу буцах
          </button>
        </section>
      </ProfileDashboardShell>
    );
  }

  return (
    <ProfileDashboardShell bankAccountHref={VENDOR_BANK_ACCOUNT_URL}>
      <ManagedOrganizationProfile
        activeOrganizationId={activeOrganizationId}
        organizations={organizations}
        onBackToPersonal={() => router.push(ACCOUNT_ROUTES.profile)}
        onSelectOrganization={(organizationId) =>
          router.push(`/profile/organizations/${encodeURIComponent(organizationId)}`)
        }
      />
    </ProfileDashboardShell>
  );
}
