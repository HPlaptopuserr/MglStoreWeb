"use client";

import { Users, Building2, TrendingUp, Briefcase, Loader2 } from "lucide-react";
import { StatCard } from "../../molecules/DashboardWidgets";
import type { DashboardStats } from "../../../lib/dashboard-api";
import { FALLBACK_SPARK, formatNumber } from "../../../lib/constants";

interface DashboardStatsGridProps {
  loading: boolean;
  data: DashboardStats | null;
  isFullAdmin?: boolean;
  canSeeJobApps?: boolean;
  canSeeRegistrations?: boolean;
}

export function DashboardStatsGrid({
  loading,
  data,
  isFullAdmin = false,
  canSeeJobApps = false,
  canSeeRegistrations = false,
}: DashboardStatsGridProps) {
  const showAll = isFullAdmin;

  const cards = [
    /* Always visible — total users */
    <StatCard
      key="users"
      icon={Users}
      iconBg="bg-indigo-50"
      iconColor="text-indigo-500"
      label="Нийт хэрэглэгч"
      value={formatNumber(data?.stats.totalUsers ?? 0)}
      trend={`${data?.stats.totalUsers ?? 0}`}
      trendUp
      sparkData={data?.sparklines.users ?? FALLBACK_SPARK.users}
    />,
    /* Always visible — active orgs */
    <StatCard
      key="orgs"
      icon={Building2}
      iconBg="bg-orange-50"
      iconColor="text-orange-500"
      label="Идэвхтэй байгууллага"
      value={formatNumber(data?.stats.activeOrganizations ?? 0)}
      trend={`${data?.stats.activeOrganizations ?? 0}`}
      trendUp
      sparkData={data?.sparklines.organizations ?? FALLBACK_SPARK.companies}
    />,
  ];

  if (showAll || canSeeRegistrations) {
    cards.push(
      <StatCard
        key="registrations"
        icon={TrendingUp}
        iconBg="bg-violet-50"
        iconColor="text-violet-500"
        label="Нийт бүртгэл"
        value={formatNumber(data?.stats.totalRegistrations ?? 0)}
        trend={`${data?.todaySummary.newRequests ?? 0} өнөөдөр`}
        trendUp={(data?.todaySummary.newRequests ?? 0) > 0}
        sparkData={FALLBACK_SPARK.registrations}
      />,
    );
  }

  if (showAll || canSeeJobApps) {
    cards.push(
      <StatCard
        key="jobApps"
        icon={Briefcase}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-500"
        label="Ирсэн анкет"
        value={formatNumber(data?.stats.totalJobApplications ?? 0)}
        trend={`${data?.todaySummary.todayJobApplications ?? 0} өнөөдөр`}
        trendUp={(data?.todaySummary.todayJobApplications ?? 0) > 0}
        sparkData={data?.sparklines.jobApplications ?? FALLBACK_SPARK.revenue}
      />,
    );
  }

  const cols = cards.length >= 4 ? "lg:grid-cols-4" : cards.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";

  return (
    <div className={`grid grid-cols-2 ${cols} gap-2.5 sm:gap-3 md:gap-4`}>
      {loading ? (
        <div className="col-span-2 lg:col-span-4 flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : (
        cards
      )}
    </div>
  );
}