"use client";
import { useState } from "react";
import type { WorkforceController } from "../useWorkforce";
import { Panel, Empty } from "../components/shared";
import { ReportFilters } from "../reports/ReportFilters";
import { ReportStats } from "../reports/ReportStats";
import { ReportDetailTable } from "../reports/ReportDetailTable";
import { ReportSummaryTable } from "../reports/ReportSummaryTable";
import {
  ManualAttendanceDialog,
  type ManualAttendanceSelection,
} from "../reports/ManualAttendanceDialog";
import { ReportEmployeePicker } from "../reports/ReportEmployeePicker";
import { ReportToolbar, ReportDisplayControls } from "../reports/ReportToolbar";
import { useReportState } from "../reports/useReportState";
export function ReportsView({
  controller,
}: {
  controller: WorkforceController;
}) {
  const state = useReportState(controller),
    { data, range } = controller;
  const [manual, setManual] = useState<ManualAttendanceSelection | null>(null);
  if (!data) return null;
  const offset = (state.current - 1) * 25;
  return (
    <>
      <ReportToolbar
        canManage={data.session.canManage}
        canExport={data.session.canExport && !state.needsEmployee}
        exportQuery={state.exportQuery}
        onManual={() =>
          setManual({
            userId: state.employee,
            day: state.view === "daily" ? state.selectedDay : undefined,
          })
        }
      />
      <ReportDisplayControls
        counts={state.counts}
        onCounts={state.setCounts}
        day={state.view === "daily" ? state.selectedDay : undefined}
        from={range.from}
        to={range.to}
        onDay={state.changeDay}
      />
      {!state.needsEmployee && (
        <ReportStats rows={state.rows} counts={state.counts} />
      )}
      <Panel
        title={
          state.view === "daily"
            ? "Өдрийн цагийн тайлан"
            : state.view === "employee"
              ? "Ажилтны цагийн дэлгэрэнгүй"
              : "Ажилтнуудын цагийн нэгтгэл"
        }
      >
        <ReportFilters
          data={data}
          value={{ ...state.filters, employee: state.employee }}
          onChange={state.changeFilters}
        />
        {state.needsEmployee ? (
          <ReportEmployeePicker
            employees={data.employees}
            query={state.filters.query}
            department={state.filters.department}
            onSelect={(userId) =>
              state.changeFilters({ ...state.filters, employee: userId })
            }
          />
        ) : !state.rows.length ? (
          <Empty />
        ) : state.view === "summary" ? (
          <ReportSummaryTable
            rows={state.summaries.slice(offset, offset + 25)}
            onEmployee={state.openEmployee}
          />
        ) : (
          <ReportDetailTable
            rows={state.rows.slice(offset, offset + 25)}
            employeeView={state.view === "employee"}
            timeZone={data.policy.timeZone}
            onManual={
              data.session.canManage
                ? (row) => setManual({ userId: row.userId, day: row.date })
                : undefined
            }
          />
        )}
        {!state.needsEmployee && (
          <div className="wf-pagination">
            <span>
              Нийт {state.total} мөр · {state.current} / {state.pages}
            </span>
            <button
              disabled={state.current === 1}
              onClick={() => state.setPage(state.current - 1)}
            >
              Өмнөх
            </button>
            <button
              disabled={state.current === state.pages}
              onClick={() => state.setPage(state.current + 1)}
            >
              Дараах
            </button>
          </div>
        )}
      </Panel>
      {manual && (
        <ManualAttendanceDialog
          controller={controller}
          selection={manual}
          onClose={() => setManual(null)}
        />
      )}
    </>
  );
}
