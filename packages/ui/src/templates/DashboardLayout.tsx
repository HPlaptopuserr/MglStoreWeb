import { ReactNode } from "react";
import { AdminSidebar, SidebarProps } from "../molecules/AdminSidebar";
import { VendorSidebar } from "../molecules/VendorSidebar";
import { VendorHeader } from "../molecules/VendorHeader";

export interface DashboardLayoutProps extends Partial<SidebarProps> {
  children: ReactNode;
  variant: "admin" | "vendor";
  userName?: string;
  userEmail?: string;
  userRole?: string;
  userInitials?: string;
  organizationName?: string;
  onSignOut?: () => void;
}

export function DashboardLayout({
  children,
  variant,
  userName,
  userRole,
  userInitials,
  organizationName,
  onSignOut,
  ...sidebarProps
}: DashboardLayoutProps) {
  const isAdmin = variant === "admin";
  const isVendor = variant === "vendor";

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

      {isVendor && <VendorSidebar onSignOut={onSignOut} />}

      <div className="flex flex-1 flex-col bg-slate-50 min-h-screen">
        {isVendor && <VendorHeader userName={organizationName || userName} />}
        <main
          className={`overflow-x-hidden ${
            isAdmin ? "px-10 pt-8 pb-10" : "px-6 pt-6 pb-10"
          }`}
        >
          <div className={`${isAdmin ? "max-w-7xl" : "max-w-6xl"} mx-auto`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
