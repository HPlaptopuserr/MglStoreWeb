"use client";

import { ReactNode } from "react";
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
  ...sidebarProps
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const isAdmin = variant === "admin";
  const isVendor = variant === "vendor";
  const isVendorPosRoute = isVendor && (pathname === "/pos" || pathname.startsWith("/pos/"));

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

      {isVendor && <VendorSidebar onSignOut={onSignOut} showPos={showPos} />}

      <div className="flex flex-1 flex-col bg-slate-50 min-h-screen">
        {isVendor && <VendorHeader userName={organizationName || userName} />}
        <main
          className={`overflow-x-hidden ${
            isAdmin
              ? "px-10 pt-8 pb-10"
              : isVendorPosRoute
                ? "px-3 pt-4 pb-6 sm:px-4"
                : "px-6 pt-6 pb-10"
          }`}
        >
          <div
            className={`${
              isAdmin
                ? "max-w-7xl"
                : isVendorPosRoute
                  ? "max-w-[1480px]"
                  : "max-w-6xl"
            } mx-auto`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
