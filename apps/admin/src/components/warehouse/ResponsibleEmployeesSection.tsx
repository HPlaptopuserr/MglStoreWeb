"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Hash,
  Loader2,
  Mail,
  Phone,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { ResponsibleEmployee } from "./types";

function EmployeeCard({
  employee,
  onRemove,
}: {
  employee: ResponsibleEmployee;
  onRemove: () => void;
}) {
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
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${employee.fullName}-г агуулахаас хасах`}
          title="Агуулахаас хасах"
          className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200"
        >
          <Trash2 className="h-4 w-4" />
        </button>
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
  onRemove,
}: {
  employees: ResponsibleEmployee[];
  onAdd: () => void;
  onRemove: (employee: ResponsibleEmployee) => Promise<void>;
}) {
  const [employeeToRemove, setEmployeeToRemove] =
    useState<ResponsibleEmployee | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const closeRemoveDialog = () => {
    if (isRemoving) return;
    setEmployeeToRemove(null);
    setRemoveError("");
  };

  const confirmRemove = async () => {
    if (!employeeToRemove || isRemoving) return;
    setIsRemoving(true);
    setRemoveError("");
    try {
      await onRemove(employeeToRemove);
      setEmployeeToRemove(null);
    } catch (error) {
      setRemoveError(
        error instanceof Error
          ? error.message
          : "Ажилтны эрхийг цуцалж чадсангүй",
      );
    } finally {
      setIsRemoving(false);
    }
  };

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
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onRemove={() => {
                setRemoveError("");
                setEmployeeToRemove(employee);
              }}
            />
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

      {employeeToRemove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-warehouse-employee-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4
                    id="remove-warehouse-employee-title"
                    className="text-lg font-bold text-slate-900"
                  >
                    Ажилтны эрхийг цуцлах уу?
                  </h4>
                  <p className="mt-1 truncate text-sm font-medium text-slate-700">
                    {employeeToRemove.fullName}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {employeeToRemove.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeRemoveDialog}
                disabled={isRemoving}
                aria-label="Хаах"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              Энэ ажилтан тухайн агуулахын WMS системд хандах эрхгүй болно.
              Хэрэглэгчийн үндсэн account устахгүй.
            </p>

            {removeError && (
              <p
                role="alert"
                className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {removeError}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeRemoveDialog}
                disabled={isRemoving}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Болих
              </button>
              <button
                type="button"
                onClick={() => void confirmRemove()}
                disabled={isRemoving}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRemoving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {isRemoving ? "Хасаж байна..." : "Эрхийг цуцлах"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
