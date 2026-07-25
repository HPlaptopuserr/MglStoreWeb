"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { AccountLibraryPanel } from "./_components/AccountLibraryPanel";
import { MembershipActivationPanel } from "./_components/MembershipActivationPanel";
import { MembershipUpgradeModal } from "./_components/MembershipUpgradeModal";
import {
  ProfileContentGrid,
  ProfileDashboardShell,
  ProfileStatsGrid,
} from "./_components/ProfileDashboardShell";
import { ProfileHero } from "./_components/ProfileHero";
import { OrganizationAffiliationCard } from "./_components/OrganizationAffiliationCard";
import { PersonalOrganizationOnboarding } from "./_components/personal-organization/PersonalOrganizationOnboarding";
import {
  createProfileFormState,
  type ProfileFormState,
} from "./_components/types";
import {
  getManagedOrganizations,
  getMembershipTierLabel,
} from "./_components/profileUtils";
import { useMembershipConfig } from "./_components/useMembershipConfig";
import { useProfileAccountData } from "./_components/useProfileAccountData";
import { useProfileNavigation } from "./_components/useProfileNavigation";
import { useProfileOrders } from "./_components/useProfileOrders";

export default function ProfilePage() {
  const { user, loading, refreshUser, authFetch } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const membershipConfig = useMembershipConfig();
  const accountData = useProfileAccountData(user, authFetch);
  const ordersData = useProfileOrders(user, authFetch);
  const refreshAccountData = accountData.refresh;
  const refreshOrders = ordersData.refresh;
  const openMembership = useCallback(() => setMembershipOpen(true), []);
  const showLibrary = useCallback(() => {
    setLibraryOpen(true);
    router.replace(ACCOUNT_ROUTES.profileLibrary);
  }, [router]);
  const showOrders = useCallback(() => {
    router.push(ACCOUNT_ROUTES.orders);
  }, [router]);
  const handleMembershipActivated = useCallback(async () => {
    await Promise.all([refreshUser(), refreshAccountData(), refreshOrders()]);
    setMembershipOpen(false);
    router.replace(ACCOUNT_ROUTES.profileLibrary);
  }, [refreshAccountData, refreshOrders, refreshUser, router]);

  useProfileNavigation({
    loading,
    onMembershipOpen: openMembership,
    router,
    user,
  });

  useEffect(() => {
    if (user) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) setForm(createProfileFormState(user));
  }, [user]);

  if (loading || !form) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) return null;

  const membershipTierLabel = getMembershipTierLabel(user);
  const managedOrganizations = getManagedOrganizations(user);
  const hasOrganizationContext = Boolean(managedOrganizations.length > 0);
  const openOrdersCount = ordersData.orders.filter(
    (order) => !["COMPLETED", "CANCELLED"].includes(order.status),
  ).length;

  return (
    <ProfileDashboardShell>
      <ProfileHero
        accountSwitcher={
          hasOrganizationContext ? (
            <OrganizationAffiliationCard
              user={user}
              onOpenOrganization={(organizationId) =>
                router.push(
                  `/profile/organizations/${encodeURIComponent(organizationId)}`,
                )
              }
            />
          ) : undefined
        }
        membershipTierLabel={membershipTierLabel}
        onUpgradeClick={openMembership}
        points={accountData.points}
        user={{ ...user, avatarUrl: form.avatarUrl }}
      />
      <ProfileStatsGrid
        libraryCount={
          accountData.purchases.length + accountData.contracts.length
        }
        onLibraryClick={showLibrary}
        onOrdersClick={showOrders}
        onPointsClick={showLibrary}
        openOrdersCount={openOrdersCount}
        ordersCount={ordersData.orders.length}
        points={accountData.points}
      />
      <PersonalOrganizationOnboarding
        authFetch={authFetch}
        onActivated={refreshUser}
      />
      <ProfileContentGrid
        contracts={accountData.contracts}
        orders={ordersData.orders}
        points={accountData.points}
        purchases={accountData.purchases}
      >
        <AccountLibraryPanel
          purchases={accountData.purchases}
          contracts={accountData.contracts}
          history={accountData.pointHistory}
          transactions={accountData.transactions}
          loading={accountData.loading}
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
        />
      </ProfileContentGrid>

      <MembershipUpgradeModal
        open={membershipOpen}
        onClose={() => setMembershipOpen(false)}
        eyebrow={membershipConfig?.upgradeModal?.eyebrow}
        title={membershipConfig?.upgradeModal?.title}
      >
        <MembershipActivationPanel
          user={user}
          form={form}
          request={authFetch}
          copy={membershipConfig?.upgradeModal}
          membershipTypes={membershipConfig?.membershipTypes}
          onActivated={handleMembershipActivated}
        />
      </MembershipUpgradeModal>
    </ProfileDashboardShell>
  );
}
