import { LockKeyhole, Pause, Play, ShieldCheck } from "lucide-react";
import {
  employeeAccess,
  employeeJob,
  isCashier,
  type StoreEmployee,
} from "../store-employee.model";
import { EmployeeAvatar } from "./EmployeePrimitives";

export function EmployeeRow({
  employee,
  onStatusChange,
}: {
  employee: StoreEmployee;
  onStatusChange: (employee: StoreEmployee) => void;
}) {
  const isOwner = employee.role === "OWNER";
  const cashier = isCashier(employee);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-4 px-5 py-5 transition-colors hover:bg-slate-50/60 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_110px_125px] lg:gap-5">
      <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
        <EmployeeAvatar
          name={employee.fullName || employee.email}
          muted={!employee.isActive}
        />
        <div className="min-w-0">
          <p
            className="truncate text-sm font-semibold text-slate-900"
            title={employee.fullName || employee.email}
          >
            {employee.fullName || employee.email}
            {isOwner && (
              <span className="ml-2 text-xs font-normal text-slate-400">
                Эзэмшигч
              </span>
            )}
          </p>
          <p
            className="mt-1 truncate text-xs text-slate-500"
            title={employee.email}
          >
            {employee.email}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {employee.phone || "Утас бүртгээгүй"}
          </p>
        </div>
      </div>
      <div className="col-span-2 lg:col-span-1">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${isOwner ? "bg-violet-50 text-violet-700" : cashier ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}
        >
          {isOwner && <ShieldCheck className="size-3.5" aria-hidden="true" />}
          {employeeJob(employee)}
        </span>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">
          {employeeAccess(employee)}
        </p>
      </div>
      <span
        className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${employee.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
      >
        <span
          className={`size-1.5 rounded-full ${employee.isActive ? "bg-emerald-500" : "bg-slate-400"}`}
          aria-hidden="true"
        />
        {employee.isActive ? "Идэвхтэй" : "Түр хаалттай"}
      </span>
      <div className="flex flex-col items-end gap-2">
        {isOwner ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <LockKeyhole className="size-3.5" aria-hidden="true" />
            Үндсэн эрх
          </span>
        ) : (
          <button
            type="button"
            aria-label={`${employee.fullName || employee.email}: ${employee.isActive ? "эрх түр хаах" : "эрх сэргээх"}`}
            onClick={() => onStatusChange(employee)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            {employee.isActive ? (
              <Pause className="size-3.5" aria-hidden="true" />
            ) : (
              <Play className="size-3.5" aria-hidden="true" />
            )}
            {employee.isActive ? "Түр хаах" : "Сэргээх"}
          </button>
        )}
      </div>
    </li>
  );
}
