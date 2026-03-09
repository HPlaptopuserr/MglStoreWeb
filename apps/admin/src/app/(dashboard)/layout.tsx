"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "../../components/templates/DashboardLayout";

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
    } else {
      setIsReady(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    router.push("/login");
  };

  if (!isReady) {
    return null;
  }

  return (
    <DashboardLayout
      onSignOut={handleLogout}
      userName="Admin User"
      userRole="ADMIN"
      userInitials="AD"
    >
      {children}
    </DashboardLayout>
  );
}
