"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WmsSidebar from "@/components/WmsSidebar";
import WmsHeader from "@/components/WmsHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userData, setUserData] = useState({
    name: "Operator",
    initials: "OP",
    warehouseName: "Агуулах",
  });

  useEffect(() => {
    const token = localStorage.getItem("wms_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("wms_user") || "{}");
      setUserData({
        name: user.name || user.fullName || "Operator",
        initials:
          user.name?.slice(0, 2).toUpperCase() ||
          user.email?.slice(0, 2).toUpperCase() ||
          "OP",
        warehouseName: user.warehouseName || "Агуулах",
      });
    } catch {
      /* keep defaults */
    }

    setIsReady(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("wms_token");
    localStorage.removeItem("wms_user");
    router.replace("/login");
  };

  if (!isReady) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <WmsSidebar
        warehouseName={userData.warehouseName}
        userName={userData.name}
        userInitials={userData.initials}
        onSignOut={handleLogout}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div
        className={`flex flex-1 flex-col transition-all duration-300 ${
          sidebarCollapsed ? "ml-[68px]" : "ml-[248px]"
        }`}
      >
        <WmsHeader userName={userData.name} userInitials={userData.initials} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
