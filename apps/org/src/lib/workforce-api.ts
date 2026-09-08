import { API, authFetch } from "@/lib/api";

export type AttendanceReportRow = {
  id: string;
  userId: string;
  employeeName: string;
  email: string;
  department: string;
  role: string;
  clockIn: string;
  clockOut: string | null;
  totalMinutes: number | null;
  status: "OPEN" | "CLOSED";
  zone: { id: string; name: string };
  method: string;
};

export type AttendanceReport = {
  range: { from: string; to: string };
  summary: {
    records: number;
    employees: number;
    totalMinutes: number;
    openSessions: number;
  };
  filters: { departments: string[] };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  rows: AttendanceReportRow[];
};

export type AttendanceReportQuery = {
  from: string;
  to: string;
  page: number;
  pageSize?: number;
  department?: string;
  search?: string;
  status?: "ALL" | "OPEN" | "CLOSED";
};

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    action?: string;
    retryable?: boolean;
    fields?: Record<string, string>;
  };
  message?: string;
};

export class WorkforceApiError extends Error {
  readonly code: string;
  readonly action: string;
  readonly retryable: boolean;
  readonly fields: Record<string, string>;

  constructor(input: {
    code: string;
    message: string;
    action: string;
    retryable?: boolean;
    fields?: Record<string, string>;
  }) {
    super(input.message);
    this.name = "WorkforceApiError";
    this.code = input.code;
    this.action = input.action;
    this.retryable = input.retryable ?? false;
    this.fields = input.fields ?? {};
  }
}

export async function fetchAttendanceReport(
  query: AttendanceReportQuery,
  signal?: AbortSignal,
): Promise<AttendanceReport> {
  const params = new URLSearchParams({
    from: query.from,
    to: query.to,
    page: String(query.page),
    pageSize: String(query.pageSize ?? 25),
  });
  if (query.department) params.set("department", query.department);
  if (query.search) params.set("search", query.search);
  if (query.status && query.status !== "ALL")
    params.set("status", query.status);

  let response: Response;
  try {
    response = await authFetch(
      `${API}/attendance/team/report?${params.toString()}`,
      { signal, cache: "no-store" },
    );
  } catch {
    if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
    throw new WorkforceApiError({
      code: "NETWORK_UNAVAILABLE",
      message: "Сервертэй холбогдож чадсангүй.",
      action: "Интернет холболтоо шалгаад дахин оролдоно уу.",
      retryable: true,
    });
  }
  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as ApiErrorBody | null;
    throw new WorkforceApiError({
      code: body?.error?.code || `HTTP_${response.status}`,
      message:
        body?.error?.message ||
        body?.message ||
        "Ирцийн тайлан авах хүсэлт амжилтгүй боллоо.",
      action:
        body?.error?.action ||
        "Дахин оролдоно уу. Алдаа давтагдвал системийн админд хандана уу.",
      retryable: body?.error?.retryable ?? response.status >= 500,
      fields: body?.error?.fields,
    });
  }
  return (await response.json()) as AttendanceReport;
}

export function canViewWorkforceReport(
  orgRole?: string | null,
  capabilities: readonly string[] = [],
) {
  return (
    orgRole === "OWNER" ||
    orgRole === "ADMIN" ||
    capabilities.includes("WORKFORCE_ATTENDANCE_VIEW")
  );
}
