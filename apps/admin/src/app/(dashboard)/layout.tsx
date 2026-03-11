"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@mgl/ui";

export default function SharedDashboardLayout({
  children,
}: {
  children: React.ReactNode;
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
      {/* Sidebar rendered outside of flex layout for guaranteed fixed position */}
      <AdminSidebar
        onSignOut={handleLogout}
        userName="Admin User"
        userRole="ADMIN"
        userInitials="AD"
      />
      {/* Main content shifted right by the width of the sidebar */}
      <div className="flex flex-col min-h-screen pl-[260px] transition-all duration-300">
        <main className="px-10 pt-8 pb-10 flex-1 w-full">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
