"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import WmsSidebar from "@/components/WmsSidebar";
import WmsHeader from "@/components/WmsHeader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  const [isReady, setIsReady]       = useState(false);
  const [isMobile, setIsMobile]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed]   = useState(false);
  const [userData, setUserData]     = useState({
    name: "Operator",
    initials: "OP",
    warehouseName: "Агуулах",
  });

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const token = localStorage.getItem("wms_token");
    if (!token) { router.replace("/login"); return; }
    try {
      const user = JSON.parse(localStorage.getItem("wms_user") || "{}");
      setUserData({
        name: user.name || user.fullName || "Operator",
        initials: user.name?.slice(0, 2).toUpperCase() || user.email?.slice(0, 2).toUpperCase() || "OP",
        warehouseName: user.warehouseName || "Агуулах",
      });
    } catch { /* keep defaults */ }
    setIsReady(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("wms_token");
    localStorage.removeItem("wms_user");
    router.replace("/login");
  };

  if (!isReady) return null;

  const sidebarW = isMobile ? 0 : collapsed ? 72 : 260;

  return (
    <div className="min-h-screen bg-slate-50">
      <WmsSidebar
        warehouseName={userData.warehouseName}
        userName={userData.name}
        userInitials={userData.initials}
        onSignOut={handleLogout}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />

      {/* Main content */}
      <div
        style={{ marginLeft: sidebarW }}
        className="flex min-h-screen flex-col transition-all duration-300"
      >
        <WmsHeader
          userName={userData.name}
          userInitials={userData.initials}
          onMenuClick={() => setMobileOpen(true)}
          isMobile={isMobile}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
