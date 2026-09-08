"use client";

import { useEffect, useState } from "react";
import {
  AttendanceReport,
  AttendanceReportQuery,
  fetchAttendanceReport,
  WorkforceApiError,
} from "@/lib/workforce-api";

export function useAttendanceReport(
  query: AttendanceReportQuery,
  enabled = true,
) {
  const [data, setData] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<WorkforceApiError | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetchAttendanceReport(query, controller.signal)
      .then((nextData) => {
        setData(nextData);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          reason instanceof WorkforceApiError
            ? reason
            : new WorkforceApiError({
                code: "UNEXPECTED_ERROR",
                message: "Тодорхойгүй алдаа гарлаа.",
                action:
                  "Дахин оролдоно уу. Алдаа давтагдвал системийн админд мэдэгдэнэ үү.",
                retryable: true,
              }),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled, query, revision]);

  return {
    data,
    loading: enabled && loading,
    error,
    retry: () => setRevision((value) => value + 1),
  };
}
