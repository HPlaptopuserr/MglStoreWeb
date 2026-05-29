"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DashboardHeader,
  DashboardStatsGrid,
  InvestorStatsGrid,
  DashboardQuickActions,
  JobApplicationsSection,
  DashboardChartsRow,
  RecentActivitySection,
  JobApplicationDetailModal,
} from "@/components/organisms/dashboard";
import { useDashboardData } from "../../../hooks/useDashboardData";
import { useJobApplications } from "../../../hooks/useJobApplications";
import { useAdminAuth } from "@/lib/admin-auth";
import type { JobApplication } from "../../../lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { hasPermission, isFullAdmin } = useAdminAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

  const { data, loading } = useDashboardData();

  const canSeeJobApps = hasPermission("MANAGE_JOB_APPLICATIONS");
  const canSeeInvestors = hasPermission("MANAGE_INVESTORS");
  const canSeeRegistrations = hasPermission("MANAGE_REGISTRATIONS");

  const { jobApps, jobAppsLoading } = useJobApplications(canSeeJobApps);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 pb-4">
      <DashboardHeader currentTime={currentTime} />

      <DashboardStatsGrid loading={loading} data={data} isFullAdmin={isFullAdmin} canSeeJobApps={canSeeJobApps} canSeeRegistrations={canSeeRegistrations} />

      {canSeeInvestors && (
        <InvestorStatsGrid loading={loading} data={data} />
      )}

      <DashboardQuickActions onNavigate={(path) => router.push(path)} hasPermission={hasPermission} isFullAdmin={isFullAdmin} />

      {canSeeJobApps && (
        <JobApplicationsSection
          jobApps={jobApps}
          jobAppsLoading={jobAppsLoading}
          onSelectApp={setSelectedApp}
          onViewAll={() => router.push("/applications")}
        />
      )}

      {(isFullAdmin || canSeeRegistrations) && (
        <DashboardChartsRow data={data} loading={loading} />
      )}

      {isFullAdmin && (
        <RecentActivitySection data={data} loading={loading} />
      )}

      {canSeeJobApps && (
        <JobApplicationDetailModal
          selectedApp={selectedApp}
          onClose={() => setSelectedApp(null)}
        />
      )}
    </div>
  );
}
