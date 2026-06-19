"use client";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import KpiGrid from "@/components/dashboard/KpiGrid";
import ModuleGrid from "@/components/dashboard/ModuleGrid";
import { useOrg } from "@/components/org/OrgContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";

export default function OrgDashboardPage() {
  const { user, features } = useOrg();
  const { loading, stats } = useDashboardStats(user.organizationId);

  return (
    <div className="space-y-6">
      <DashboardHeader user={user} />
      <KpiGrid loading={loading} stats={stats} />
      <ModuleGrid features={features} />
    </div>
  );
}
