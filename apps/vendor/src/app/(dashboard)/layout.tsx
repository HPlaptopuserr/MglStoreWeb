"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@mgl/ui";

export default function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [userData, setUserData] = useState({
    name: "Vendor",
    email: "vendor@mglstore.mn",
    role: "VENDOR",
    initials: "VN",
  });

  useEffect(() => {
    const token = localStorage.getItem("vendor_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const storedUser = JSON.parse(
        localStorage.getItem("vendor_user") || "{}",
      );

      setUserData({
        name: storedUser.name || "Vendor",
        email: storedUser.email || "vendor@mglstore.mn",
        role: storedUser.role || "VENDOR",
        initials: storedUser.name?.slice(0, 2).toUpperCase() || "VN",
      });
    } catch {
      setUserData({
        name: "Vendor",
        email: "vendor@mglstore.mn",
        role: "VENDOR",
        initials: "VN",
      });
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
    >
      {children}
    </DashboardLayout>
  );
}
