"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { workforceReportViews, parseWorkforceReportView } from "@mgl/types";
export function ReportNavigation() {
  const search = useSearchParams();
  const selected = parseWorkforceReportView(search.get("report"));
  return (
    <nav
      className="wf-segment wf-report-navigation"
      aria-label="Цагийн тайлангийн төрөл"
    >
      {workforceReportViews.map((view) => {
        const params = new URLSearchParams(search.toString());
        params.set("report", view.id);
        return (
          <Link
            key={view.id}
            href={`/attendance/reports?${params}`}
            className={selected === view.id ? "active" : ""}
            aria-current={selected === view.id ? "page" : undefined}
          >
            {view.label}
          </Link>
        );
      })}
    </nav>
  );
}
