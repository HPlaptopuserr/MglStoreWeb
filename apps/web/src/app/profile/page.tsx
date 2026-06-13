"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AccountLibraryPanel } from "./_components/AccountLibraryPanel";
import { OrdersPanel } from "./_components/OrdersPanel";
import { MembershipActivationPanel } from "./_components/MembershipActivationPanel";
import { MembershipUpgradeModal } from "./_components/MembershipUpgradeModal";
import {
  ProfileContentGrid,
  ProfileDashboardShell,
  ProfileStatsGrid,
} from "./_components/ProfileDashboardShell";
import { ProfileHero } from "./_components/ProfileHero";
import { OrganizationAffiliationCard } from "./_components/OrganizationAffiliationCard";
import {
  createProfileFormState,
  type ProfileFormState,
  type ProfileTab,
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
  const [tab, setTab] = useState<ProfileTab>("orders");
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const membershipConfig = useMembershipConfig();
  const accountData = useProfileAccountData(user, authFetch);
  const ordersData = useProfileOrders(user, authFetch);
  const openMembership = useCallback(() => setMembershipOpen(true), []);

  useProfileNavigation({
    loading,
    onMembershipOpen: openMembership,
    router,
    setTab,
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
  const hasOrganizationContext = Boolean(
    managedOrganizations.length > 0,
  );

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
        user={{ ...user, avatarUrl: form.avatarUrl }}
      />
      <ProfileStatsGrid
        isMember={Boolean(user.membership?.active || user.isPrime)}
        libraryCount={accountData.purchases.length + accountData.contracts.length}
        membershipTierLabel={membershipTierLabel}
        ordersCount={ordersData.orders.length}
        points={accountData.points}
      />
      <ProfileContentGrid
        contracts={accountData.contracts}
        orders={ordersData.orders}
        points={accountData.points}
        purchases={accountData.purchases}
      >
        {tab === "library" ? (
          <AccountLibraryPanel
            purchases={accountData.purchases}
            contracts={accountData.contracts}
            points={accountData.points}
            history={accountData.pointHistory}
            loading={accountData.loading}
          />
        ) : (
          <OrdersPanel
            orders={ordersData.orders}
            loading={ordersData.loading}
            error={ordersData.error || accountData.error}
            onRefresh={ordersData.refresh}
          />
        )}
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
        />
      </MembershipUpgradeModal>
    </ProfileDashboardShell>
  );
}
