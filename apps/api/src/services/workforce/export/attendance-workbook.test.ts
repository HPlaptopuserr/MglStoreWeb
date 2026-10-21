import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultWorkforceFeatures, type WorkforceRow } from "@mgl/types";
import ExcelJS from "exceljs";
import { createAttendanceWorkbook } from "./attendance-workbook";
import {
  attendanceDates,
  attendanceDayValue,
  attendanceMetrics,
} from "./attendance-matrix";
const row: WorkforceRow = {
  id: "u:2026-10-01",
  userId: "u",
  employeeName: "Ирцийн нэр",
  department: "Борлуулалт",
  date: "2026-10-01",
  scheduledStart: "2026-10-01T01:00:00Z",
  scheduledEnd: "2026-10-01T10:00:00Z",
  shiftName: "Үндсэн",
  clockIn: "2026-10-01T00:30:00Z",
  clockOut: "2026-10-01T10:30:00Z",
  plannedMinutes: 480,
  workedMinutes: 540,
  lateMinutes: 0,
  earlyMinutes: 0,
  absentMinutes: 0,
  overtimeMinutes: 60,
  approvedOvertimeMinutes: 60,
  status: "CLOCKED_OUT",
  recordIds: ["r"],
};
const data = {
  range: { from: "2026-10-01", to: "2026-10-31" },
  policy: {
    timeZone: "Asia/Ulaanbaatar",
    lateGraceMinutes: 0,
    features: defaultWorkforceFeatures,
    requestKinds: [],
    approvalRequired: true,
  },
  employees: [],
};
test("calendar supports leap months and overnight and open records", () => {
  assert.equal(attendanceDates("2024-02-01", "2024-02-29").length, 29);
  assert.equal(attendanceDates("2026-12-31", "2027-01-01").length, 2);
  assert.equal(
    attendanceDayValue({ ...row, clockOut: null }, "Asia/Ulaanbaatar"),
    "08:30 - --:--",
  );
  assert.equal(
    attendanceDayValue(
      { ...row, clockOut: "2026-10-01T17:00:00Z" },
      "Asia/Ulaanbaatar",
    ),
    "08:30 - 10/02 01:00",
  );
  const metrics = attendanceMetrics([row]);
  assert.equal(metrics[6].minutes, 480);
  assert.equal(metrics[10].minutes, 60);
  assert.equal(metrics[11].minutes, 540); // no overtime double count
  assert.equal(metrics[4].minutes, null);
});
test("matrix matches reference headers, merges, totals and styles after XLSX round trip", async () => {
  const workbook = createAttendanceWorkbook(data, [row]);
  const reopened = new ExcelJS.Workbook();
  await reopened.xlsx.load(await workbook.xlsx.writeBuffer());
  const sheet = reopened.worksheets[0];
  assert.equal(sheet.name, "Ерөнхий тайлан");
  assert.equal(sheet.columnCount, 76);
  assert.equal(sheet.getCell("B4").value, "Ирцийн нэр");
  assert.equal(sheet.getCell("J4").value, "08:30 - 18:30");
  assert.equal(sheet.getCell("AO2").value, "Ажиллавал зохих");
  assert.equal(sheet.getCell("BX3").value, "Мин");
  assert.equal(sheet.getCell("BK4").value, 9);
  assert.equal(sheet.getCell("BW4").value, 9);
  assert.equal(sheet.getCell("AO5").result, 1);
  assert.equal(sheet.getCell("AO5").formula, "SUM(AO4:AO4)");
  assert.equal(sheet.getCell("A1").isMerged, true);
  assert.equal(sheet.views[0].state, "frozen");
});
