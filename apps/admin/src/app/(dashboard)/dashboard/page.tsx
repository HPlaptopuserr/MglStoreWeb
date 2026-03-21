"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "../../../components/organisms/dashboard/DashboardHeader";
import { DashboardStatsGrid } from "../../../components/organisms/dashboard/DashboardStatsGrid";
import { InvestorStatsGrid } from "../../../components/organisms/dashboard/InvestorStatsGrid";
import { DashboardQuickActions } from "../../../components/organisms/dashboard/DashboardQuickActions";
import { JobApplicationsSection } from "../../../components/organisms/dashboard/JobApplicationsSection";
import { DashboardChartsRow } from "../../../components/organisms/dashboard/DashboardChartsRow";
import { RecentActivitySection } from "../../../components/organisms/dashboard/RecentActivitySection";
import { JobApplicationDetailModal } from "../../../components/organisms/dashboard/JobApplicationDetailModal";
import { useDashboardData } from "../../../hooks/useDashboardData";
import { useJobApplications } from "../../../hooks/useJobApplications";
import type { JobApplication } from "../../../lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

  const { data, loading } = useDashboardData();
  const { jobApps, jobAppsLoading } = useJobApplications();

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 pb-4">
      <DashboardHeader currentTime={currentTime} />

      <DashboardStatsGrid loading={loading} data={data} />

      <InvestorStatsGrid loading={loading} data={data} />

      <DashboardQuickActions
        onNavigate={(path) => router.push(path)}
      />

      <JobApplicationsSection
        jobApps={jobApps}
        jobAppsLoading={jobAppsLoading}
        onSelectApp={setSelectedApp}
        onViewAll={() => router.push("/applications")}
      />

      <DashboardChartsRow data={data} loading={loading} />

      <RecentActivitySection data={data} loading={loading} />

      <JobApplicationDetailModal
        selectedApp={selectedApp}
        onClose={() => setSelectedApp(null)}
      />
    </div>
  );
}