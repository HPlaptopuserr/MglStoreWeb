"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@mgl/ui";
import {
  isFeatureEnabled,
  POS_FEATURE_KEY,
  PREORDER_PRODUCTS_FEATURE_KEY,
  SERVICE_POSTS_FEATURE_KEY,
  SUPPLY_PRODUCTS_FEATURE_KEY,
} from "@/lib/vendor-features";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "https://mgl-api.onrender.com";

export default function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [showPos, setShowPos] = useState(false);
  const [showSupplyProducts, setShowSupplyProducts] = useState(false);
  const [showPreorderProducts, setShowPreorderProducts] = useState(false);
  const [showServicePosts, setShowServicePosts] = useState(true);
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
      if (!organizationId) {
        const payload = token ? JSON.parse(atob(token.split(".")[1] || "")) : null;
        organizationId = payload?.organizationId || "";
      }

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

    if (organizationId) {
      fetch(`${API_URL}/api/site-settings`, { cache: "no-store" })
        .then(async (settingRes) => {
          const settings = settingRes.ok
            ? ((await settingRes.json()) as Record<string, unknown>)
            : {};
          setShowPos(isFeatureEnabled(settings, POS_FEATURE_KEY, organizationId));
          setShowSupplyProducts(
            isFeatureEnabled(settings, SUPPLY_PRODUCTS_FEATURE_KEY, organizationId),
          );
          setShowPreorderProducts(
            isFeatureEnabled(settings, PREORDER_PRODUCTS_FEATURE_KEY, organizationId),
          );
          setShowServicePosts(
            isFeatureEnabled(settings, SERVICE_POSTS_FEATURE_KEY, organizationId, true),
          );
        })
        .catch(() => {
          setShowPos(false);
          setShowSupplyProducts(false);
          setShowPreorderProducts(false);
          setShowServicePosts(true);
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
      showPreorderProducts={showPreorderProducts}
      showServicePosts={showServicePosts}
    >
      {children}
    </DashboardLayout>
  );
}
