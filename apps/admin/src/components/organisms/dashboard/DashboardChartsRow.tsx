"use client";

import { BarChart3, Loader2 } from "lucide-react";
import { PieChart } from "../PieChart";
import type { DashboardStats } from "../../../lib/dashboard-api";

interface DashboardChartsRowProps {
  data: DashboardStats | null;
  loading: boolean;
}

export function DashboardChartsRow({
  data,
  loading,
}: DashboardChartsRowProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
      {data ? (
        <PieChart
          title="Бүртгэлийн хүсэлтийн тоо"
          total={data.pieChart.total}
          label={data.pieChart.label}
          items={data.pieChart.items.map((item) => ({
            label: `${item.label} (${item.count})`,
            colorClass: "",
          }))}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center min-h-50">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5 flex flex-col">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-500" />
          Өнөөдрийн товч
        </h3>

        <div className="space-y-3 flex-1">
          {(() => {
            const s = data?.todaySummary;
            const totalReqs =
              (s?.newRequests ?? 0) + (s?.approved ?? 0) + (s?.rejected ?? 0);

            return [
              {
                label: "Шинэ хүсэлт",
                value: s?.newRequests ?? 0,
                total: Math.max(totalReqs, 1),
                color: "bg-indigo-500",
                bgColor: "bg-indigo-50",
              },
              {
                label: "Зөвшөөрсөн",
                value: s?.approved ?? 0,
                total: Math.max(totalReqs, 1),
                color: "bg-emerald-500",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Татгалзсан",
                value: s?.rejected ?? 0,
                total: Math.max(totalReqs, 1),
                color: "bg-rose-500",
                bgColor: "bg-rose-50",
              },
              {
                label: "Ирсэн анкет",
                value: s?.todayJobApplications ?? 0,
                total: Math.max(s?.todayJobApplications ?? 0, 1),
                color: "bg-amber-500",
                bgColor: "bg-amber-50",
              },
            ];
          })().map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-500">
                  {item.label}
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {item.value}
                  <span className="text-slate-300 font-medium">/{item.total}</span>
                </span>
              </div>
              <div className={`h-2 rounded-full ${item.bgColor} overflow-hidden`}>
                <div
                  className={`h-full rounded-full ${item.color} transition-all duration-700 ease-out`}
                  style={{
                    width: `${Math.min(100, (item.value / item.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}