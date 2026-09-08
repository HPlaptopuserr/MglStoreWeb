export const WORKFORCE_ATTENDANCE_VIEW = "WORKFORCE_ATTENDANCE_VIEW";
export const WORKFORCE_REPORT_EXPORT = "WORKFORCE_REPORT_EXPORT";

const ATTENDANCE_MANAGER_ROLES = new Set(["OWNER", "ADMIN"]);

export type AttendanceAccessContext = {
  orgRole: string | null;
  capabilities: readonly string[];
};

export function canManageAttendance(context: AttendanceAccessContext): boolean {
  return Boolean(
    context.orgRole && ATTENDANCE_MANAGER_ROLES.has(context.orgRole),
  );
}

export function canViewWorkforceAttendance(
  context: AttendanceAccessContext,
): boolean {
  return (
    canManageAttendance(context) ||
    context.capabilities.includes(WORKFORCE_ATTENDANCE_VIEW)
  );
}

export function canExportWorkforceReports(
  context: AttendanceAccessContext,
): boolean {
  return (
    canManageAttendance(context) ||
    context.capabilities.includes(WORKFORCE_REPORT_EXPORT)
  );
}
