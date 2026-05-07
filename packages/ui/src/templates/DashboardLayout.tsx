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
  showServicePosts?: boolean;
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
  showServicePosts,
  ...sidebarProps
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const isAdmin = variant === "admin";
  const isVendor = variant === "vendor";
  const isVendorPosRoute =
    isVendor && (pathname === "/pos" || pathname.startsWith("/pos/"));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
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
          showPos={showPos}
          showSupplyProducts={showSupplyProducts}
          showServicePosts={showServicePosts}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex min-h-screen flex-1 flex-col bg-slate-50 min-w-0">
        {isVendor && (
          <VendorHeader
            userName={organizationName || userName}
            onMenuToggle={() => setMobileMenuOpen((o) => !o)}
          />
        )}
        {isVendor ? (
          <main className="min-w-0 flex-1 overflow-x-hidden bg-slate-50">
            {children}
          </main>
        ) : (
          <main
            className={`overflow-x-hidden ${
              isAdmin
                ? "px-4 pt-6 pb-10 sm:px-10 sm:pt-8"
                : "px-4 pt-5 pb-10 sm:px-6 sm:pt-6"
            }`}
          >
            <div className={`${isAdmin ? "max-w-7xl" : "max-w-6xl"} mx-auto`}>
              {children}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
