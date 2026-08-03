"use client";

import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar, SidebarProps } from "../organisms/AdminSidebar";
import { VendorSidebar } from "../organisms/VendorSidebar";
import { VendorHeader } from "../organisms/VendorHeader";

export interface DashboardLayoutProps extends Partial<SidebarProps> {
  children: ReactNode;
  variant: "admin" | "vendor";
  userName?: string;
  userEmail?: string;
  userRole?: string;
  userInitials?: string;
  organizationName?: string;
  onSignOut?: () => void;
  showPos?: boolean;
  showSupplyProducts?: boolean;
  showPreorderProducts?: boolean;
  showServicePosts?: boolean;
  showContractArchive?: boolean;
  vendorBottomSlot?: ReactNode;
  notificationComponent?: ReactNode;
}

export function DashboardLayout({
  children,
  variant,
  userName,
  userRole,
  userInitials,
  organizationName,
  onSignOut,
  showPos,
  showSupplyProducts,
  showPreorderProducts,
  showServicePosts,
  showContractArchive,
  vendorBottomSlot,
  notificationComponent,
  ...sidebarProps
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const isAdmin = variant === "admin";
  const isVendor = variant === "vendor";
  const isVendorPosRoute =
    isVendor && (pathname === "/pos" || pathname.startsWith("/pos/"));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh w-full overflow-x-hidden bg-slate-50 font-sans">
      {isAdmin && (
        <AdminSidebar
          {...sidebarProps}
          userName={userName}
          userRole={userRole}
          userInitials={userInitials}
          onSignOut={onSignOut}
        />
      )}

      {isVendor && (
        <VendorSidebar
          onSignOut={onSignOut}
          userName={organizationName || userName}
          userRole={userRole}
          userInitials={userInitials}
          showPos={showPos}
          showSupplyProducts={showSupplyProducts}
          showPreorderProducts={showPreorderProducts}
          showServicePosts={showServicePosts}
          showContractArchive={showContractArchive}
          bottomSlot={vendorBottomSlot}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col bg-slate-50">
        {isVendor && !isVendorPosRoute && (
          <VendorHeader
            onMenuToggle={() => setMobileMenuOpen((o) => !o)}
            notificationComponent={notificationComponent}
          />
        )}
        <main
          data-scroll-lock-root
          className={`min-w-0 overflow-x-hidden ${
            isAdmin
              ? "px-4 pt-6 pb-10 sm:px-10 sm:pt-8"
              : isVendorPosRoute
                ? "px-2 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4"
                : "px-3 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-6"
          }`}
        >
          <div
            className={`${
              isAdmin
                ? "max-w-7xl"
                : isVendorPosRoute
                  ? "max-w-[1480px]"
                  : "max-w-6xl"
            } mx-auto w-full min-w-0`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
