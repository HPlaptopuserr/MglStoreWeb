"use client";
import { reportPeriodRange } from "./report-period";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  filterWorkforceReportRows,
  summarizeWorkforceReport,
  parseWorkforceReportView,
} from "@mgl/types";
import type { WorkforceController } from "../useWorkforce";
import { emptyReportFilters, type ReportFilterState } from "./ReportFilters";
export function useReportState({ data, range, setRange }: WorkforceController) {
  const search = useSearchParams(),
    router = useRouter(),
    view = parseWorkforceReportView(search.get("report"));
  const [filters, setFilters] = useState<ReportFilterState>(emptyReportFilters),
    [day, setDay] = useState(""),
    [counts, setCounts] = useState(false),
    [page, setPage] = useState(1);
  const employee = search.get("userId") ?? filters.employee;
  const selectedDay = day >= range.from && day <= range.to ? day : range.to;
  const rows = useMemo(
    () =>
      filterWorkforceReportRows(data?.rows ?? [], {
        userId: employee,
        department: filters.department,
        status: filters.status,
        query: filters.query,
        day: view === "daily" ? selectedDay : undefined,
      }),
    [data, employee, filters, view, selectedDay],
  );
  const summaries = useMemo(() => summarizeWorkforceReport(rows), [rows]);
  const needsEmployee =
    view === "employee" &&
    !data?.employees.some((item) => item.userId === employee);
  const total = view === "summary" ? summaries.length : rows.length,
    pages = Math.max(1, Math.ceil(total / 25)),
    current = Math.min(page, pages);
  const exportQuery = new URLSearchParams({
    organizationId: data?.organization.id ?? "",
    from: view === "daily" ? selectedDay : range.from,
    to: view === "daily" ? selectedDay : range.to,
    report: view,
    ...(employee ? { userId: employee } : {}),
    ...(filters.department ? { department: filters.department } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.query ? { q: filters.query } : {}),
  });
  function changeFilters(next: ReportFilterState) {
    setFilters(next);
    setPage(1);
    if (search.has("userId")) {
      const params = new URLSearchParams(search.toString());
      params.delete("userId");
      router.replace(`/attendance/reports?${params}`, { scroll: false });
    }
  }
  function openEmployee(userId: string) {
    setFilters({ ...emptyReportFilters, employee: userId });
    if (data && range.from === data.today && range.to === data.today)
      setRange(reportPeriodRange("month", data.today));
    const params = new URLSearchParams(search.toString());
    params.set("report", "employee");
    params.set("userId", userId);
    setPage(1);
    router.replace(`/attendance/reports?${params}`, { scroll: false });
  }
  return {
    view,
    filters,
    employee,
    selectedDay,
    rows,
    summaries,
    needsEmployee,
    total,
    pages,
    current,
    counts,
    setCounts,
    setPage,
    exportQuery,
    changeFilters,
    openEmployee,
    changeDay: (next: string) => {
      setDay(next);
      setPage(1);
    },
  };
}
