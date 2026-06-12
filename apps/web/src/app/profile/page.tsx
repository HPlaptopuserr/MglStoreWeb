"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { API } from "@/lib/api";
import { useAuth, type AuthUser } from "@/lib/auth-context";
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
  type AccountContract,
  type AccountPurchase,
  type MPointHistory,
  type ProfileOrder,
  type ProfileFormState,
  type ProfileTab,
} from "./_components/types";

function getMembershipTierLabel(user: AuthUser) {
  const rawTier =
    (user.membership as { tier?: string; membershipType?: string } | undefined)
      ?.tier ||
    (user.membership as { tier?: string; membershipType?: string } | undefined)
      ?.membershipType ||
    "";
  const tier = rawTier.toUpperCase();
  if (tier === "BRANCH_COUNCIL" || tier === "GOLD") return "Gold";
  if (tier === "GOVERNING_COUNCIL" || tier === "PLATINUM") return "Platinum";
  if (tier === "ACTIVE" || tier === "SILVER") return "Silver";
  return user.membership?.active || user.isPrime ? "Member" : "Идэвхгүй";
}

export default function ProfilePage() {
  const { user, loading, refreshUser, authFetch } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<ProfileTab>("orders");
  const [form, setForm] = useState<ProfileFormState | null>(null);

  const [purchases, setPurchases] = useState<AccountPurchase[]>([]);
  const [contracts, setContracts] = useState<AccountContract[]>([]);
  const [orders, setOrders] = useState<ProfileOrder[]>([]);
  const [points, setPoints] = useState(0);
  const [pointHistory, setPointHistory] = useState<MPointHistory[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [membershipOpen, setMembershipOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    const allowedTabs: ProfileTab[] = ["library", "orders"];
    if (window.location.hash === "#membership-activation") {
      setMembershipOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
    if (
      requestedTab &&
      ["profile", "address", "security"].includes(requestedTab)
    ) {
      router.replace(`/profile/settings?section=${requestedTab}`);
      return;
    }
    if (requestedTab && allowedTabs.includes(requestedTab as ProfileTab)) {
      setTab(requestedTab as ProfileTab);
    }
  }, [router]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (user) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) setForm(createProfileFormState(user));
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchAccountData = async () => {
      setAccountLoading(true);
      try {
        const [purchaseRes, pointRes, historyRes, contractRes] =
          await Promise.all([
            authFetch(`${API}/customer/purchases`),
            authFetch(`${API}/customer/loyalty/points`),
            authFetch(`${API}/customer/loyalty/history`),
            authFetch(`${API}/contracts/my`),
          ]);

        if (purchaseRes.ok) {
          const data = await purchaseRes.json().catch(() => ({}));
          setPurchases(Array.isArray(data.purchases) ? data.purchases : []);
        }
        if (pointRes.ok) {
          const data = await pointRes.json().catch(() => ({}));
          setPoints(Number(data.points || 0));
        }
        if (historyRes.ok) {
          const data = await historyRes.json().catch(() => []);
          setPointHistory(Array.isArray(data) ? data : []);
        }
        if (contractRes.ok) {
          const data = await contractRes.json().catch(() => ({}));
          setContracts(Array.isArray(data.contracts) ? data.contracts : []);
        }
      } catch (error) {
        console.error("Failed to fetch profile account data", error);
      } finally {
        setAccountLoading(false);
      }
    };

    fetchAccountData();
  }, [authFetch, user]);

  const fetchOrders = async () => {
    if (!user) return;
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const res = await authFetch(`${API}/store/orders`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOrdersError(data?.message || "Захиалгууд ачаалахад алдаа гарлаа");
        return;
      }
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch {
      setOrdersError("Сүлжээний алдаа гарлаа");
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const hasOrganizationContext = Boolean(user.organizationId && user.orgRole);

  return (
    <ProfileDashboardShell>
      <ProfileHero
        membershipTierLabel={membershipTierLabel}
        onUpgradeClick={() => setMembershipOpen(true)}
        user={{ ...user, avatarUrl: form.avatarUrl }}
      />
      {hasOrganizationContext && <OrganizationAffiliationCard user={user} />}
      <ProfileStatsGrid
        isMember={Boolean(user.membership?.active || user.isPrime)}
        libraryCount={purchases.length + contracts.length}
        membershipTierLabel={membershipTierLabel}
        ordersCount={orders.length}
        points={points}
      />
      <ProfileContentGrid
        contracts={contracts}
        orders={orders}
        points={points}
        purchases={purchases}
      >
        {tab === "library" ? (
          <AccountLibraryPanel
            purchases={purchases}
            contracts={contracts}
            points={points}
            history={pointHistory}
            loading={accountLoading}
          />
        ) : (
          <OrdersPanel
            orders={orders}
            loading={ordersLoading}
            error={ordersError}
            onRefresh={fetchOrders}
          />
        )}
      </ProfileContentGrid>

      <MembershipUpgradeModal
        open={membershipOpen}
        onClose={() => setMembershipOpen(false)}
      >
        <MembershipActivationPanel
          user={user}
          form={form}
          request={authFetch}
        />
      </MembershipUpgradeModal>
    </ProfileDashboardShell>
  );
}
