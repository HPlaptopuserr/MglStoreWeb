"use client";
import { useMemo, useState } from "react";
import type { WorkforceController } from "../useWorkforce";
import { AttendanceInsights } from "../analytics/AttendanceInsights";
import {
  EmployeeAnalytics,
  RequestAnalytics,
} from "../analytics/SummaryPanels";
import { TimeBreakdown } from "../analytics/PerformancePanels";
import { summarize } from "../analytics/model";
export function AnalyticsView({
  controller,
}: {
  controller: WorkforceController;
}) {
  const { data } = controller;
  const [tab, setTab] = useState("attendance");
  const employeeMetrics = useMemo(
    () => summarize(data?.rows ?? [], "employee"),
    [data?.rows],
  );
  const departmentMetrics = useMemo(
    () => summarize(data?.rows ?? [], "department"),
    [data?.rows],
  );
  if (!data) return null;
  return (
    <>
      <div className="wf-tabs" role="group" aria-label="Хянах самбарын хэсэг">
        {[
          ["employees", "Багийн бүтэц"],
          ["attendance", "Цаг ба ирц"],
          ["requests", "Хүсэлтийн урсгал"],
          ["payroll", "Цалингийн цагийн суурь"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={tab === key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "employees" ? (
        <EmployeeAnalytics data={data} />
      ) : tab === "requests" ? (
        <RequestAnalytics data={data} />
      ) : tab === "attendance" ? (
        <AttendanceInsights data={data} onRange={controller.setRange} />
      ) : (
        <>
          <p className="wf-muted">
            Цалингийн системд ашиглах цагийн нэгтгэл. Мөнгөн дүн, татвар энд
            тооцохгүй.
          </p>
          <TimeBreakdown
            employees={employeeMetrics}
            departments={departmentMetrics}
          />
        </>
      )}
    </>
  );
}
