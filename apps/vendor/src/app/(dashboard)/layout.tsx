"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@mgl/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [showPos, setShowPos] = useState(false);
  const [userData, setUserData] = useState({
    name: "Vendor",
    email: "vendor@mglstore.mn",
    role: "VENDOR",
    initials: "VN",
    organizationName: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("vendor_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    let organizationId = "";
    try {
      const storedUser = JSON.parse(
        localStorage.getItem("vendor_user") || "{}",
      );

      organizationId = storedUser.organizationId || "";

      setUserData({
        name: storedUser.name || storedUser.fullName || "Vendor",
        email: storedUser.email || "vendor@mglstore.mn",
        role: storedUser.role || "VENDOR",
        initials: storedUser.name?.slice(0, 2).toUpperCase() || "VN",
        organizationName: storedUser.organizationName || "",
      });
    } catch {
      setUserData({
        name: "Vendor",
        email: "vendor@mglstore.mn",
        role: "VENDOR",
        initials: "VN",
        organizationName: "",
      });
    }

    // POS is visible only when org has registers and admin has POS access toggle enabled.
    if (organizationId) {
      Promise.all([
        fetch(`${API_URL}/api/admin/pos-registers?organizationId=${organizationId}`),
        fetch(`${API_URL}/api/site-settings`),
      ])
        .then(async ([regRes, settingRes]) => {
          const registers = regRes.ok ? await regRes.json() : [];
          const settings = settingRes.ok
            ? ((await settingRes.json()) as Record<string, string>)
            : {};
          const raw = settings[`pos-enabled-${organizationId}`];
          const posEnabled =
            raw == null || raw === "" || raw === "1" || raw === "true" || raw === "on";
          setShowPos(Array.isArray(registers) && registers.length > 0 && posEnabled);
        })
        .catch(() => setShowPos(false));
    }

    setIsReady(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("vendor_token");
    localStorage.removeItem("vendor_user");
    router.replace("/login");
  };

  if (!isReady) return null;

  return (
    <DashboardLayout
      variant="vendor"
      onSignOut={handleLogout}
      userName={userData.name}
      userEmail={userData.email}
      userRole={userData.role}
      userInitials={userData.initials}
      organizationName={userData.organizationName}
      showPos={showPos}
    >
      {children}
    </DashboardLayout>
  );
}
