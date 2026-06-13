"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@mgl/ui";
import { NotificationDropdown } from "@/components/organisms/NotificationDropdown";
import {
  isFeatureEnabled,
  POS_FEATURE_KEY,
  PREORDER_PRODUCTS_FEATURE_KEY,
  SERVICE_POSTS_FEATURE_KEY,
  SUPPLY_PRODUCTS_FEATURE_KEY,
} from "@/lib/vendor-features";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

type VendorOrganization = {
  id: string;
  name: string;
  role: string;
};

export default function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [showPos, setShowPos] = useState(false);
  const [showSupplyProducts, setShowSupplyProducts] = useState(false);
  const [showPreorderProducts, setShowPreorderProducts] = useState(false);
  const [showServicePosts, setShowServicePosts] = useState(true);
  const [organizations, setOrganizations] = useState<VendorOrganization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [isSwitchingOrganization, setIsSwitchingOrganization] = useState(false);
  const [userData, setUserData] = useState({
    name: "Vendor",
    email: "vendor@mglstore.mn",
    role: "VENDOR",
    initials: "VN",
    organizationName: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("vendor_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const clearSession = () => {
      localStorage.removeItem("vendor_token");
      localStorage.removeItem("vendor_user");
      router.replace("/login");
    };

    const hydrateSession = async () => {
      try {
        const meRes = await fetch(`${API_URL}/auth/me`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!meRes.ok) {
          clearSession();
          return;
        }

        const me = await meRes.json();
        if (!me.organizationId) {
          clearSession();
          return;
        }

        const storedUser = JSON.parse(localStorage.getItem("vendor_user") || "{}");
        const nextUser = {
          ...storedUser,
          ...me,
          organizationName: storedUser.organizationName || me.organizationName || "",
        };
        localStorage.setItem("vendor_user", JSON.stringify(nextUser));
        setOrganizations(Array.isArray(me.organizations) ? me.organizations : []);
        setSelectedOrganizationId(me.organizationId || "");

        setUserData({
          name: nextUser.name || nextUser.fullName || "Vendor",
          email: nextUser.email || "vendor@mglstore.mn",
          role: nextUser.role || "VENDOR",
          initials: (nextUser.name || nextUser.fullName || "VN").slice(0, 2).toUpperCase(),
          organizationName: nextUser.organizationName || "",
        });

        const settingRes = await fetch(`${API_URL}/api/site-settings`, { cache: "no-store" });
        const settings = settingRes.ok
          ? ((await settingRes.json()) as Record<string, unknown>)
          : {};
        setShowPos(isFeatureEnabled(settings, POS_FEATURE_KEY, me.organizationId));
        setShowSupplyProducts(
          isFeatureEnabled(settings, SUPPLY_PRODUCTS_FEATURE_KEY, me.organizationId),
        );
        setShowPreorderProducts(
          isFeatureEnabled(settings, PREORDER_PRODUCTS_FEATURE_KEY, me.organizationId),
        );
        setShowServicePosts(
          isFeatureEnabled(settings, SERVICE_POSTS_FEATURE_KEY, me.organizationId, true),
        );
        setIsReady(true);
      } catch {
        clearSession();
      }
    };

    hydrateSession();
  }, [router]);

  const handleOrganizationChange = async (organizationId: string) => {
    const currentToken = localStorage.getItem("vendor_token");
    if (!currentToken || !organizationId || organizationId === selectedOrganizationId) {
      return;
    }

    setIsSwitchingOrganization(true);
    try {
      const response = await fetch(`${API_URL}/auth/vendor/switch-organization`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ organizationId }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Байгууллага солиход алдаа гарлаа");
      }

      localStorage.setItem("vendor_token", data.accessToken);
      localStorage.setItem("vendor_user", JSON.stringify(data.user));
      window.location.reload();
    } catch (error) {
      console.error("[vendor organization switch error]", error);
      setIsSwitchingOrganization(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("vendor_token");
    localStorage.removeItem("vendor_user");
    router.replace("/login");
  };

  if (!isReady) return null;

  return (
    <DashboardLayout
      variant="vendor"
      onSignOut={handleLogout}
      userName={userData.name}
      userEmail={userData.email}
      userRole={userData.role}
      userInitials={userData.initials}
      organizationName={userData.organizationName}
      showPos={showPos}
      showSupplyProducts={showSupplyProducts}
      showPreorderProducts={showPreorderProducts}
      showServicePosts={showServicePosts}
      notificationComponent={
        <>
          {organizations.length > 1 && (
            <select
              value={selectedOrganizationId}
              disabled={isSwitchingOrganization}
              onChange={(event) => handleOrganizationChange(event.target.value)}
              className="h-9 max-w-[190px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-300 disabled:cursor-wait disabled:opacity-60"
              aria-label="Байгууллага солих"
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          )}
          <NotificationDropdown />
        </>
      }
    >
      {children}
    </DashboardLayout>
  );
}
