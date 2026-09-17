"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DashboardLayout } from "@mgl/ui";
import { NotificationDropdown } from "@/components/organisms/NotificationDropdown";
import VendorTutorialButton from "@/components/organisms/VendorTutorialButton";
import { VendorUpdateAnnouncement } from "@/components/organisms/VendorUpdateAnnouncement";
import { useVendorSession } from "@/features/session/useVendorSession";
import { MemberWorkspace } from "@/features/session/MemberWorkspace";
import {
  canAccessVendorPath,
  organizationDestination,
} from "@/features/session/vendor-session.model";
import { VendorOrganizationSwitcher } from "@/features/session/VendorOrganizationSwitcher";
import {
  VendorSessionFeedback,
  VendorSessionLoading,
} from "@/features/session/VendorSessionFeedback";
import {
  isFeatureEnabled,
  POS_FEATURE_KEY,
  PREORDER_PRODUCTS_FEATURE_KEY,
  SERVICE_POSTS_FEATURE_KEY,
  SUPPLY_PRODUCTS_FEATURE_KEY,
  CONTRACT_ARCHIVE_FEATURE_KEY,
} from "@/lib/vendor-features";

export default function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    state,
    mode,
    retry,
    logout,
    switching,
    switchError,
    switchOrganization,
  } = useVendorSession(pathname);
  const redirectDestination =
    mode !== null && !canAccessVendorPath(mode, pathname)
      ? organizationDestination(mode, pathname)
      : null;

  useEffect(() => {
    if (redirectDestination && !switching) router.replace(redirectDestination);
  }, [redirectDestination, switching, router]);

  if (state.status === "loading" || switching || redirectDestination)
    return <VendorSessionLoading switching={switching} />;
  if (state.status === "error")
    return (
      <VendorSessionFeedback
        title="Дэлгүүрийн мэдээлэл ачаалсангүй"
        message={state.message}
        onLogout={logout}
      >
        <button
          type="button"
          onClick={retry}
          className="min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Дахин оролдох
        </button>
      </VendorSessionFeedback>
    );

  const { user, settings } = state;
  const selector = (
    <VendorOrganizationSwitcher
      organizations={user.organizations}
      selectedId={user.organizationId}
      disabled={switching}
      onChange={(id) => void switchOrganization(id)}
    />
  );
  if (!mode || !user.organizationId)
    return (
      <VendorSessionFeedback
        title="Ажиллах дэлгүүрээ сонгоно уу"
        message="Нэвтрэлт хэвээр байна. Сонгосон байгууллагад Vendor эрх олгогдоогүй тул эзэмшигч эсвэл кассын эрхтэй дэлгүүрээ сонгоно уу."
        onLogout={logout}
      >
        {selector}
        {switchError && (
          <p role="alert" className="text-sm text-rose-700">
            {switchError}
          </p>
        )}
      </VendorSessionFeedback>
    );

  if (mode === "member")
    return (
      <MemberWorkspace
        user={user}
        selector={selector}
        error={switchError}
        onLogout={logout}
      />
    );

  const organizationId = user.organizationId;
  const name = user.fullName || user.email || "Vendor";
  const enabled = (key: string, fallback = false) =>
    isFeatureEnabled(settings, key, organizationId, fallback);
  return (
    <>
      {mode === "owner" && <VendorUpdateAnnouncement />}
      <DashboardLayout
        variant="vendor"
        onSignOut={logout}
        userName={name}
        userEmail={user.email || ""}
        userRole={mode === "cashier" ? "Кассын ажилтан" : "Дэлгүүрийн эзэмшигч"}
        userInitials={name.slice(0, 2).toUpperCase()}
        organizationName={user.organizationName}
        showPos={enabled(POS_FEATURE_KEY)}
        showSupplyProducts={enabled(SUPPLY_PRODUCTS_FEATURE_KEY)}
        showPreorderProducts={enabled(PREORDER_PRODUCTS_FEATURE_KEY)}
        showServicePosts={enabled(SERVICE_POSTS_FEATURE_KEY, true)}
        showContractArchive={enabled(CONTRACT_ARCHIVE_FEATURE_KEY)}
        vendorAccessMode={mode}
        vendorBottomSlot={
          mode === "owner" ? (
            <VendorTutorialButton variant="sidebar" />
          ) : undefined
        }
        notificationComponent={
          <>
            {user.organizations.length > 1 && selector}
            {mode === "owner" && <NotificationDropdown />}
          </>
        }
      >
        {switchError && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800"
          >
            {switchError}
          </div>
        )}
        {children}
      </DashboardLayout>
    </>
  );
}
