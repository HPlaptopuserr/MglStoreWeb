"use client";

import {
  CheckCircle2,
  Clock3,
  Hash,
  Mail,
  Phone,
  UserPlus,
  Users,
} from "lucide-react";
import type { ResponsibleEmployee } from "./types";

function EmployeeCard({ employee }: { employee: ResponsibleEmployee }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#5B4CFF]/30 hover:bg-white hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-violet-50 text-sm font-bold text-[#5B4CFF]">
          {employee.avatarUrl ? (
            <img
              src={employee.avatarUrl}
              alt={employee.fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            employee.fullName.slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-slate-900">
              {employee.fullName}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${employee.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
            >
              {employee.isActive ? "Идэвхтэй" : "Идэвхгүй"}
            </span>
          </div>
          <div className="mt-2 space-y-1.5 text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">{employee.email}</span>
            </p>
            {employee.phoneNumber && (
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                {employee.phoneNumber}
              </p>
            )}
            {employee.operatorId && (
              <p className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-slate-400" />
                Оператор ID: {employee.operatorId}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          {employee.setupCompletedAt ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Clock3 className="h-3.5 w-3.5 text-amber-500" />
          )}
          {employee.setupCompletedAt
            ? "Нэвтрэх эрх баталгаажсан"
            : "Нууц үг тохируулаагүй"}
        </span>
        <span>
          Сүүлд нэвтэрсэн:{" "}
          {employee.lastLoginAt
            ? new Date(employee.lastLoginAt).toLocaleString("mn-MN")
            : "Нэвтрээгүй"}
        </span>
      </div>
    </article>
  );
}

export function ResponsibleEmployeesSection({
  employees,
  onAdd,
}: {
  employees: ResponsibleEmployee[];
  onAdd: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-slate-900">
            <Users className="h-5 w-5 text-[#5B4CFF]" />
            Агуулах хариуцсан ажилтнууд
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            WMS системд энэ агуулахыг хариуцах эрхтэй ажилтнууд
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-[#5B4CFF]">
            {employees.length} ажилтан
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B4CFF] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:-translate-y-0.5 hover:bg-[#4b3ee8] sm:w-auto"
          >
            <UserPlus className="h-4 w-4" />
            Ажилтан нэмэх
          </button>
        </div>
      </div>
      {employees.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {employees.map((employee) => (
            <EmployeeCard key={employee.id} employee={employee} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
          <Users className="mx-auto mb-3 h-9 w-9 text-slate-300" />
          <p className="font-medium text-slate-600">
            Хариуцсан ажилтан бүртгээгүй байна
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Ажилтан нэмэх товчоор personal account сонгоно уу.
          </p>
        </div>
      )}
    </section>
  );
}
