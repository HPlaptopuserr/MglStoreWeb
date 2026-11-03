import { reportPeriodRange } from "./report-period";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filterWorkforceReportRows,
  summarizeWorkforceReport,
  workforceReportTotals,
  type WorkforceRow,
} from "@mgl/types";
const row: WorkforceRow = {
  id: "1",
  userId: "one",
  date: "2026-10-01",
  employeeName: "Ижил нэр",
  department: "Борлуулалт",
  status: "PRESENT",
  clockIn: "2026-10-01T01:00:00Z",
  clockOut: "2026-10-01T10:00:00Z",
  shiftName: null,
  scheduledStart: null,
  scheduledEnd: null,
  plannedMinutes: 480,
  workedMinutes: 540,
  lateMinutes: 10,
  earlyMinutes: 0,
  absentMinutes: 0,
  overtimeMinutes: 60,
  approvedOvertimeMinutes: 0,
  recordIds: ["r1"],
};
test("report groups use identity rather than employee name and sum time accurately", () => {
  const rows = [
    row,
    { ...row, id: "2", date: "2026-10-02", lateMinutes: 0, workedMinutes: 480 },
    { ...row, id: "3", userId: "two" },
  ];
  const result = summarizeWorkforceReport(rows);
  assert.equal(result.length, 2);
  const first = result.find((item) => item.userId === "one");
  assert.equal(first?.workedMinutes, 1020);
  assert.equal(first?.recordedDays, 2);
  assert.equal(first?.lateDays, 1);
  assert.equal(workforceReportTotals(rows).workedMinutes, 1560);
});
test("day, employee and export search filters select the same report rows", () => {
  const rows = [
    row,
    { ...row, id: "2", date: "2026-10-02" },
    { ...row, id: "3", userId: "two", employeeName: "Өөр нэр" },
  ];
  assert.equal(
    filterWorkforceReportRows(rows, {
      day: "2026-10-01",
      userId: "one",
      query: " ижил ",
    }).length,
    1,
  );
  assert.equal(
    filterWorkforceReportRows(rows, { department: "Санхүү" }).length,
    0,
  );
  assert.deepEqual(summarizeWorkforceReport([]), []);
});

test("report period presets respect month length and year boundaries", () => {
  assert.deepEqual(reportPeriodRange("month", "2024-02-12"), {
    from: "2024-02-01",
    to: "2024-02-29",
  });
  assert.deepEqual(reportPeriodRange("week", "2026-01-03"), {
    from: "2025-12-28",
    to: "2026-01-03",
  });
});
