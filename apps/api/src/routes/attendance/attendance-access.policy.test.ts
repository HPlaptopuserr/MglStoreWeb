import assert from "node:assert/strict";
import test from "node:test";
import {
  canExportWorkforceReports,
  canManageAttendance,
  canViewWorkforceAttendance,
  WORKFORCE_ATTENDANCE_VIEW,
  WORKFORCE_REPORT_EXPORT,
} from "./attendance-access.policy";

test("owner and admin can manage attendance", () => {
  assert.equal(
    canManageAttendance({ orgRole: "OWNER", capabilities: [] }),
    true,
  );
  assert.equal(
    canManageAttendance({ orgRole: "ADMIN", capabilities: [] }),
    true,
  );
  assert.equal(
    canManageAttendance({ orgRole: "STAFF", capabilities: [] }),
    false,
  );
});

test("HR-style capabilities grant report access without structural admin role", () => {
  assert.equal(
    canViewWorkforceAttendance({
      orgRole: "STAFF",
      capabilities: [WORKFORCE_ATTENDANCE_VIEW],
    }),
    true,
  );
  assert.equal(
    canExportWorkforceReports({
      orgRole: "STAFF",
      capabilities: [WORKFORCE_REPORT_EXPORT],
    }),
    true,
  );
});

test("viewer has no workforce report access by default", () => {
  const context = { orgRole: "VIEWER", capabilities: [] };
  assert.equal(canViewWorkforceAttendance(context), false);
  assert.equal(canExportWorkforceReports(context), false);
});
