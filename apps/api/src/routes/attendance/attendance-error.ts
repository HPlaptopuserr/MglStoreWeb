import type { Response } from "express";

export type AttendanceErrorCode =
  | "ATTENDANCE_ORGANIZATION_REQUIRED"
  | "ATTENDANCE_REPORT_FORBIDDEN"
  | "ATTENDANCE_DATE_RANGE_INVALID"
  | "ATTENDANCE_REPORT_FAILED";

type AttendanceErrorInput = {
  status: number;
  code: AttendanceErrorCode;
  message: string;
  action: string;
  retryable?: boolean;
  fields?: Record<string, string>;
};

export function sendAttendanceError(
  res: Response,
  error: AttendanceErrorInput,
) {
  return res.status(error.status).json({
    error: {
      code: error.code,
      message: error.message,
      action: error.action,
      retryable: error.retryable ?? false,
      ...(error.fields ? { fields: error.fields } : {}),
    },
  });
}
