import { test } from "node:test";
import assert from "node:assert/strict";
import type { WorkforceRow } from "@mgl/types";
import { category, summarize, weekdayDistribution } from "./model";
function row(changes: Partial<WorkforceRow> = {}): WorkforceRow {
  return {
    id: "r",
    date: "2026-10-12",
    userId: "u",
    employeeName: "Employee",
    department: "Team",
    shiftName: "Day",
    scheduledStart: "2026-10-12T01:00:00Z",
    scheduledEnd: "2026-10-12T10:00:00Z",
    clockIn: "2026-10-12T01:00:00Z",
    clockOut: "2026-10-12T10:00:00Z",
    plannedMinutes: 480,
    workedMinutes: 480,
    lateMinutes: 0,
    earlyMinutes: 0,
    absentMinutes: 0,
    overtimeMinutes: 0,
    approvedOvertimeMinutes: 0,
    status: "CLOCKED_OUT",
    recordIds: ["record"],
    ...changes,
  };
}
test("overtime cannot mask a shortfall on a different day", () => {
  const [metric] = summarize(
    [
      row({ workedMinutes: 600, overtimeMinutes: 120 }),
      row({ date: "2026-10-13", workedMinutes: 240, earlyMinutes: 240 }),
    ],
    "employee",
  );
  assert.equal(metric?.worked, 840);
  assert.equal(metric?.covered, 720);
  assert.equal(metric?.ratio, 0.75);
  assert.equal(metric?.earlyDays, 1);
});
test("unscheduled hours stay separate from planned coverage", () => {
  const [metric] = summarize(
    [row({ plannedMinutes: 0, workedMinutes: 120, status: "UNSCHEDULED" })],
    "employee",
  );
  assert.equal(metric?.ratio, null);
  assert.equal(metric?.worked, 120);
  assert.equal(metric?.covered, 0);
});
test("departments aggregate minutes and employee-day frequency", () => {
  const [metric] = summarize(
    [row({ lateMinutes: 20 }), row({ userId: "second", lateMinutes: 10 })],
    "department",
  );
  assert.equal(metric?.late, 30);
  assert.equal(metric?.lateDays, 2);
  assert.equal(metric?.planned, 960);
});
test("matrix distinguishes approved leave, missing records and short completed work", () => {
  assert.equal(category(row({ status: "LEAVE", plannedMinutes: 0 })), "leave");
  assert.equal(
    category(row({ status: "UNRECORDED", workedMinutes: 0 })),
    "pending",
  );
  assert.equal(category(row({ workedMinutes: 100 })), "partial");
  assert.equal(category(row({ earlyMinutes: 10 })), "early");
});
test("weekday distributions use calendar date and exclude unscheduled days", () => {
  const groups = weekdayDistribution([
    row({ lateMinutes: 10 }),
    row({ date: "2026-10-13", status: "DAY_OFF", plannedMinutes: 0 }),
    row({ date: "2026-10-13", status: "LEAVE", plannedMinutes: 0 }),
  ]);
  assert.equal(groups[0]?.counts.late, 1);
  assert.equal(groups[1]?.total, 1);
  assert.equal(groups[1]?.counts.leave, 1);
  assert.equal(groups[6]?.total, 0);
});

test("future scheduled days do not inflate missing attendance in weekday charts", () => {
  const future = row({
    status: "SCHEDULED",
    clockIn: null,
    clockOut: null,
    recordIds: [],
    workedMinutes: 0,
  });
  assert.equal(category(future), "scheduled");
  assert.equal(weekdayDistribution([future])[0]?.total, 0);
});
