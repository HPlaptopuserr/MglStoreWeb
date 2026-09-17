"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Link2,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useStoreEmployees } from "./useStoreEmployees";
import { summarizeEmployees, type StoreEmployee } from "./store-employee.model";
import { AssignEmployeeDialog } from "./components/AssignEmployeeDialog";
import { EmployeeCashierDialog } from "./components/EmployeeCashierDialog";
import { EmployeeStatusDialog } from "./components/EmployeeStatusDialog";
import { EmployeeAlert, EmployeeButton } from "./components/EmployeePrimitives";
import { EmployeeDirectory } from "./components/EmployeeDirectory";
import { EmployeeOverview } from "./components/EmployeeOverview";

type ActiveDialog =
  | { type: "assign" }
  | { type: "status"; employee: StoreEmployee }
  | { type: "cashier"; employee: StoreEmployee }
  | null;

export function StoreEmployees({ organizationId }: { organizationId: string }) {
  const { employees, loading, error, reload, saveEmployee } =
    useStoreEmployees(organizationId);
  const summary = useMemo(() => summarizeEmployees(employees), [employees]);
  const [dialog, setDialog] = useState<ActiveDialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  function saved(employee: StoreEmployee) {
    saveEmployee(employee);
    setNotice(
      dialog?.type === "assign" || dialog?.type === "cashier"
        ? `${employee.fullName || employee.email} — кассын эрх амжилттай олголоо.`
        : `${employee.fullName || employee.email} — ${employee.isActive ? "ажлын эрхийг сэргээлээ" : "ажлын эрхийг түр хаалаа"}.`,
    );
    setDialog(null);
  }
  return (
    <section
      aria-labelledby="employees-title"
      className="mx-auto w-full max-w-7xl space-y-6 pb-6"
    >
      <header>
        <div className="mb-5 flex items-center gap-2 text-xs text-slate-400">
          <span>Үйл ажиллагаа</span>
          <ChevronRight className="size-3" aria-hidden="true" />
          <span className="font-medium text-slate-600">Ажилтнууд</span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1
                id="employees-title"
                className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]"
              >
                Дэлгүүрийн ажилтнууд
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">
                <ShieldCheck className="size-3" aria-hidden="true" />
                Эзэмшигчийн удирдлага
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Багаа бүрдүүлж, ажилтан бүрийн ажлын эрхийг удирдаарай.
            </p>
          </div>
          <EmployeeButton
            disabled={!organizationId || loading || Boolean(error)}
            onClick={() => setDialog({ type: "assign" })}
            className="shrink-0"
          >
            <Plus className="size-4" aria-hidden="true" />
            Ажилтан нэмэх
          </EmployeeButton>
        </div>
      </header>
      {notice && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            aria-label="Мэдэгдэл хаах"
            onClick={() => setNotice(null)}
            className="flex size-9 items-center justify-center rounded-lg hover:bg-emerald-100 focus-visible:outline-2"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
      <EmployeeOverview summary={summary} loading={loading || Boolean(error)} />
      <aside className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 p-4 sm:items-center sm:gap-4 sm:px-5">
        <span className="rounded-xl border border-blue-100 bg-white p-2.5 text-blue-600">
          <Link2 className="size-5" aria-hidden="true" />
        </span>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-slate-800">
            Нэг бүртгэл. Ажиллах эрх нь тусдаа.
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            MGL Store-ийн хувийн бүртгэлээс хүнээ сонгоод кассын эрх олгоно.
            Ажилтан өөрийн бүртгэлээр нэвтэрнэ.
          </p>
        </div>
        <span className="hidden whitespace-nowrap rounded-lg border border-blue-100 bg-white/80 px-3 py-1.5 text-[11px] font-medium text-blue-700 xl:block">
          MGL Store бүртгэлтэй холбогдоно
        </span>
      </aside>
      {error ? (
        <EmployeeAlert retry={() => void reload()}>{error}</EmployeeAlert>
      ) : (
        <EmployeeDirectory
          employees={employees}
          summary={summary}
          loading={loading}
          onGrantCashier={(employee) =>
            setDialog({ type: "cashier", employee })
          }
          onStatusChange={(employee) => setDialog({ type: "status", employee })}
          onAdd={() => setDialog({ type: "assign" })}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <p className="flex items-center gap-2">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Хувийн бүртгэлийн нууц үг, мэдээлэл өөрчлөгдөхгүй.
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={() => void reload()}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 disabled:opacity-50"
        >
          <RefreshCw
            className={`size-3.5 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`}
            aria-hidden="true"
          />
          Жагсаалт шинэчлэх
        </button>
      </div>
      {dialog?.type === "assign" && (
        <AssignEmployeeDialog
          organizationId={organizationId}
          onClose={() => setDialog(null)}
          onSuccess={saved}
        />
      )}
      {dialog?.type === "cashier" && (
        <EmployeeCashierDialog
          employee={dialog.employee}
          organizationId={organizationId}
          onClose={() => setDialog(null)}
          onSuccess={saved}
        />
      )}
      {dialog?.type === "status" && (
        <EmployeeStatusDialog
          employee={dialog.employee}
          organizationId={organizationId}
          onClose={() => setDialog(null)}
          onSuccess={saved}
        />
      )}
    </section>
  );
}
