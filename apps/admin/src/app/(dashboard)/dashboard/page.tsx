"use client";

import { useState } from "react";
import { DashboardMetrics } from "../../../components/organisms/DashboardMetrics";
import { RevenueChart, TimeRange } from "../../../components/organisms/RevenueChart";
import { PieChart } from "../../../components/organisms/PieChart";

import { MOCK_REVENUE_DATA, MOCK_DASHBOARD_METRICS, MOCK_PIE_CHART_DATA } from "../../../lib/mock-data";

export default function DashboardPage() {
  const [activeRange, setActiveRange] = useState<TimeRange>("7d");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Хяналтын самбар</h1>
        <p className="text-slate-500 text-sm">Бодит цагийн гүйцэтгэлийн үзүүлэлтүүд болон оюутны үйл ажиллагаа.</p>
      </div>

      <DashboardMetrics
        totalStudents={MOCK_DASHBOARD_METRICS.totalStudents}
        activeCourses={MOCK_DASHBOARD_METRICS.activeCourses}
        registered={MOCK_DASHBOARD_METRICS.registered}
        realIncome={MOCK_DASHBOARD_METRICS.realIncome}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueChart
          data={MOCK_REVENUE_DATA[activeRange]}
          activeRange={activeRange}
          onRangeChange={setActiveRange}
        />
        <PieChart
          title={<>Бүртгэгдсэн байгууллагын <br /> тоо</>}
          total={MOCK_PIE_CHART_DATA.total}
          label={MOCK_PIE_CHART_DATA.label}
          items={MOCK_PIE_CHART_DATA.items}
        />
      </div>
    </div>
  );
}
