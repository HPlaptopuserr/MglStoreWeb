"use client";
import { useState } from "react";
import type { WorkforceController } from "../hooks/useWorkforce";
import { Panel, Empty } from "../components/shared";
import { ReportFilters } from "../reports/ReportFilters";
import { ReportStats } from "../reports/ReportStats";
import { ReportDetailTable } from "../reports/ReportDetailTable";
import { ReportSummaryTable } from "../reports/ReportSummaryTable";
import {
  ManualAttendanceDialog,
  type ManualAttendanceSelection,
} from "../reports/ManualAttendanceDialog";
import { EmployeeReportEntry } from "../reports/EmployeeReportEntry";
import { EmployeeChooserDialog } from "../reports/EmployeeChooserDialog";
import { EmployeeReportHeader } from "../reports/EmployeeReportHeader";
import { ReportRangeControl } from "../reports/ReportRangeControl";
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
  const [choosing, setChoosing] = useState(false);
  if (!data) return null;
  const offset = (state.current - 1) * 25;
  const selectedEmployee = data.employees.find(
    (employee) => employee.userId === state.employee,
  );
  return (
    <>
      <ReportToolbar
        selectionPending={state.needsEmployee}
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
      {!state.needsEmployee && (
        <>
          <div className="wf-report-context">
            {state.view === "employee" && selectedEmployee && (
              <EmployeeReportHeader
                employee={selectedEmployee}
                onChange={() => setChoosing(true)}
                onClear={() =>
                  state.changeFilters({
                    ...state.filters,
                    employee: "",
                    query: "",
                    status: "",
                    department: "",
                  })
                }
              />
            )}
            <ReportRangeControl
              range={range}
              today={data.today}
              onChange={controller.setRange}
            />
          </div>
          <ReportDisplayControls
            counts={state.counts}
            onCounts={state.setCounts}
            day={state.view === "daily" ? state.selectedDay : undefined}
            from={range.from}
            to={range.to}
            onDay={state.changeDay}
          />
        </>
      )}
      {!state.needsEmployee && (
        <div className="wf-report-totals">
          <ReportStats rows={state.rows} counts={state.counts} />
        </div>
      )}
      {state.needsEmployee ? (
        <EmployeeReportEntry
          employees={data.employees}
          onChoose={() => setChoosing(true)}
          onSelect={(id) => state.openEmployee(id)}
        />
      ) : (
        <>
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
              hideDirectory={state.view === "employee"}
              data={data}
              value={{ ...state.filters, employee: state.employee }}
              onChange={state.changeFilters}
            />
            {!state.rows.length ? (
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
        </>
      )}
      {choosing && (
        <EmployeeChooserDialog
          data={data}
          onClose={() => setChoosing(false)}
          onSelect={(id) => {
            state.openEmployee(id);
            setChoosing(false);
          }}
        />
      )}
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
