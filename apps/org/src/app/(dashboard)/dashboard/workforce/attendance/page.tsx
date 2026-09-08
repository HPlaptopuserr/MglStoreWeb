"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Printer,
} from "lucide-react";
import { useOrg } from "@/components/org/OrgContext";
import AttendanceReportFilters, {
  AttendanceFilterValue,
} from "@/components/workforce/AttendanceReportFilters";
import AttendanceReportTable from "@/components/workforce/AttendanceReportTable";
import AttendanceSummaryCards from "@/components/workforce/AttendanceSummaryCards";
import WorkforceErrorPanel from "@/components/workforce/WorkforceErrorPanel";
import { useAttendanceReport } from "@/hooks/useAttendanceReport";
import { canViewWorkforceReport } from "@/lib/workforce-api";

function inputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function WorkforceAttendancePage() {
  const { user } = useOrg();
  const today = useMemo(() => new Date(), []);
  const monthStart = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today],
  );
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AttendanceFilterValue>({
    from: inputDate(monthStart),
    to: inputDate(today),
    search: "",
    department: "",
    status: "ALL",
  });
  const deferredSearch = useDeferredValue(filters.search.trim());
  const allowed = canViewWorkforceReport(user.orgRole, user.capabilities);
  const query = useMemo(
    () => ({
      from: `${filters.from}T00:00:00.000Z`,
      to: `${filters.to}T23:59:59.999Z`,
      page,
      pageSize: 25,
      search: deferredSearch,
      department: filters.department,
      status: filters.status,
    }),
    [
      deferredSearch,
      filters.department,
      filters.from,
      filters.status,
      filters.to,
      page,
    ],
  );
  const report = useAttendanceReport(query, allowed);

  if (!allowed) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-amber-600" />
        <h1 className="mt-3 text-xl font-black">
          Тайлан харах эрх хүрэлцэхгүй
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Байгууллагын эзэмшигчээс workforce тайлангийн эрх авна уу.
        </p>
      </div>
    );
  }

  return (
    <div className="workforce-report space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
            Ажиллах хүч
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">
            Цаг бүртгэлийн тайлан
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Ажилтан, хэлтэс, огноо болон төлвөөр нэгтгэн хянах хэсэг.
          </p>
        </div>
        <button
          type="button"
          disabled={!report.data?.rows.length}
          onClick={() => window.print()}
          className="print-hidden inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Printer className="h-4 w-4" />
          Хэвлэх / PDF
        </button>
      </header>

      <div className="print-hidden">
        <AttendanceReportFilters
          value={filters}
          departments={report.data?.filters.departments ?? []}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
        />
      </div>

      {report.loading && !report.data ? (
        <div
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Ачаалж байна"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>
      ) : report.error ? (
        <WorkforceErrorPanel error={report.error} onRetry={report.retry} />
      ) : report.data ? (
        <>
          <AttendanceSummaryCards summary={report.data.summary} />
          {report.data.rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <Clock3 className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-black text-slate-700">
                Тохирох бүртгэл олдсонгүй
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Шүүлтүүр эсвэл огноогоо өөрчилнө үү.
              </p>
            </div>
          ) : (
            <AttendanceReportTable rows={report.data.rows} />
          )}
          <footer className="print-hidden flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm font-bold text-slate-500">
              {report.data.pagination.total} бүртгэл ·{" "}
              {report.data.pagination.page}/{report.data.pagination.totalPages}{" "}
              хуудас
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Өмнөх хуудас"
                disabled={page <= 1 || report.loading}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="rounded-xl border border-slate-200 p-2 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Дараагийн хуудас"
                disabled={
                  page >= report.data.pagination.totalPages || report.loading
                }
                onClick={() => setPage((value) => value + 1)}
                className="rounded-xl border border-slate-200 p-2 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </footer>
        </>
      ) : null}
    </div>
  );
}
