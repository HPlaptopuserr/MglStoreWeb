"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@mgl/ui";
import { MobileDashboard } from "../../components/organisms/MobileDashboard";

export default function SharedDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setIsReady(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    router.push("/login");
  };

  if (!isReady) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Mobile header / drawer */}
      <div className="md:hidden">
        <MobileDashboard
          onSignOut={handleLogout}
          userName="Admin User"
          userRole="ADMIN"
          userInitials="AD"
        />
      </div>

      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <AdminSidebar
            onSignOut={handleLogout}
            userName="Admin User"
            userRole="ADMIN"
            userInitials="AD"
          />
        </div>

        {/* Page content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 w-full px-4 pt-2 pb-6 md:px-8 md:pt-8 md:pb-10">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
