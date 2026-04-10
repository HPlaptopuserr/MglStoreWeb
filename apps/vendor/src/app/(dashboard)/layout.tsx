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
  const [showSupplyProducts, setShowSupplyProducts] = useState(false);
  const [showServicePosts, setShowServicePosts] = useState(false);
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

    // Vendor UI should not call admin-only register list endpoint.
    // Keep POS menu visibility based on org POS toggle; register readiness is handled inside POS page.
    if (organizationId) {
      fetch(`${API_URL}/api/site-settings`)
        .then(async (settingRes) => {
          const settings = settingRes.ok
            ? ((await settingRes.json()) as Record<string, string>)
            : {};
          const raw = settings[`pos-enabled-${organizationId}`];
          const posEnabled =
            raw === "1" || raw === "true" || raw === "on";
          setShowPos(posEnabled);

          const rawSupply = settings[`supply-products-enabled-${organizationId}`];
          setShowSupplyProducts(rawSupply === "1" || rawSupply === "true" || rawSupply === "on");

          const rawService = settings[`service-posts-enabled-${organizationId}`];
          setShowServicePosts(rawService === "1" || rawService === "true" || rawService === "on");
        })
        .catch(() => {
          setShowPos(false);
          setShowSupplyProducts(false);
          setShowServicePosts(false);
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
      organizationName={userData.organizationName}
      showPos={showPos}
      showSupplyProducts={showSupplyProducts}
      showServicePosts={showServicePosts}
    >
      {children}
    </DashboardLayout>
  );
}
