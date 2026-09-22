"use client";

import { ReactNode, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useOrgFeatures } from "@/hooks/useOrgFeatures";
import { useOrgSession } from "@/hooks/useOrgSession";
import { OrgProvider } from "@/components/org/OrgContext";
import OrgShellLoading from "@/components/org/OrgShellLoading";
import OrgSidebar from "@/components/org/OrgSidebar";
import OrgTopbar from "@/components/org/OrgTopbar";
import { getOrgNavItems } from "@/components/org/orgNavigation";

export default function OrgShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { ready, user, logout, switching, switchError, switchOrganization } =
    useOrgSession();
  const { features, loading: featuresLoading } = useOrgFeatures(
    user?.organizationId,
  );
  const navItems = useMemo(
    () => getOrgNavItems(features, user),
    [features, user],
  );
  const isRestaurantWorkspace =
    pathname.startsWith("/dashboard/restaurant-pos") ||
    pathname.startsWith("/dashboard/kitchen-display") ||
    pathname.startsWith("/dashboard/self-service");

  if (!ready || !user || featuresLoading) return <OrgShellLoading />;

  if (isRestaurantWorkspace) {
    return (
      <OrgProvider value={{ user, features, logout }}>
        <main className="h-screen overflow-hidden bg-[#191b28] text-slate-100">
          {children}
        </main>
      </OrgProvider>
    );
  }

  const sidebar = (
    <OrgSidebar
      navItems={navItems}
      pathname={pathname}
      user={user}
      onLogout={logout}
      onNavigate={() => setMobileOpen(false)}
    />
  );

  return (
    <OrgProvider value={{ user, features, logout }}>
      <div className="min-h-screen bg-slate-50 text-slate-950">
        <div className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
          {sidebar}
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
              aria-label="Цэс хаах"
            />
            <div className="relative h-full w-72">{sidebar}</div>
          </div>
        )}

        <div className="lg:pl-72">
          <OrgTopbar
            mobileOpen={mobileOpen}
            user={user}
            organizations={user.organizations || []}
            switching={switching}
            switchError={switchError}
            onOpenMenu={() => setMobileOpen(true)}
            onSwitchOrganization={(organizationId) =>
              void switchOrganization(organizationId)
            }
          />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            {children}
          </main>
        </div>
      </div>
    </OrgProvider>
  );
}
