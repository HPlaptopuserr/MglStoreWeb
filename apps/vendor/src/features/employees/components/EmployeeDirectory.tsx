"use client";

import { useState } from "react";
import { Search, SearchX, ShieldCheck, Users, X } from "lucide-react";
import type {
  EmployeeFilter,
  EmployeeSummary,
  StoreEmployee,
} from "../store-employee.model";
import { filterEmployees } from "../store-employee.model";
import { EmployeeButton } from "./EmployeePrimitives";
import { EmployeeRow } from "./EmployeeRow";

const FILTERS: { value: EmployeeFilter; label: string }[] = [
  { value: "ALL", label: "Бүгд" },
  { value: "ACTIVE", label: "Идэвхтэй" },
  { value: "INACTIVE", label: "Түр хаалттай" },
];

export function EmployeeDirectory({
  employees,
  summary,
  loading,
  onStatusChange,
  onGrantCashier,
  onAdd,
}: {
  employees: StoreEmployee[];
  summary: EmployeeSummary;
  loading: boolean;
  onGrantCashier: (employee: StoreEmployee) => void;
  onStatusChange: (employee: StoreEmployee) => void;
  onAdd: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<EmployeeFilter>("ALL");
  const visible = filterEmployees(employees, query, filter);
  const counts: Record<EmployeeFilter, number> = {
    ALL: summary.total,
    ACTIVE: summary.active,
    INACTIVE: summary.inactive,
  };

  return (
    <section
      aria-labelledby="employee-directory-title"
      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2
            id="employee-directory-title"
            className="text-base font-bold text-slate-900"
          >
            Танай баг{" "}
            <span className="ml-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
              {loading ? "—" : employees.length}
            </span>
          </h2>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">
            Ажил үүрэг, хандах эрх болон төлөвийг нэг дор удирдаарай.
          </p>
        </div>
        <div className="relative w-full xl:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            aria-label="Багийн ажилтан хайх"
            placeholder="Нэр, утас, имэйлээр хайх…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-9 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              aria-label="Багийн хайлт цэвэрлэх"
              onClick={() => setQuery("")}
              className="absolute right-0 top-0 flex size-10 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 focus-visible:outline-2"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div
        className="flex flex-wrap gap-1 border-b border-slate-100 px-4 pt-2 sm:px-5"
        aria-label="Ажилтны төлөвөөр шүүх"
      >
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`relative flex min-h-12 items-center gap-2 border-b-2 px-3 pb-2 pt-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-blue-500 sm:text-sm ${filter === value ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-800"}`}
          >
            {label}
            <span
              className={`rounded-md px-1.5 py-0.5 text-[11px] ${filter === value ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}
            >
              {loading ? "—" : counts[value]}
            </span>
          </button>
        ))}
      </div>
      {loading ? (
        <div role="status" className="divide-y divide-slate-100 px-5 sm:px-6">
          <span className="sr-only">Ажилтны мэдээлэл ачаалж байна</span>
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              aria-hidden="true"
              className="flex animate-pulse items-center gap-4 py-6 motion-reduce:animate-none"
            >
              <div className="size-11 rounded-2xl bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/4 rounded bg-slate-100" />
                <div className="h-3 w-2/5 rounded bg-slate-100" />
              </div>
              <div className="h-6 w-20 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      ) : visible.length > 0 ? (
        <>
          <div
            className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_110px_125px] gap-5 border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-[11px] font-semibold tracking-wide text-slate-500 lg:grid"
            aria-hidden="true"
          >
            <span>АЖИЛТАН</span>
            <span>АЖИЛ ҮҮРЭГ / ЭРХ</span>
            <span>ТӨЛӨВ</span>
            <span className="text-right">УДИРДАХ</span>
          </div>
          <ul
            aria-label="Дэлгүүрийн ажилтнууд"
            className="divide-y divide-slate-100"
          >
            {visible.map((employee) => (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                onStatusChange={onStatusChange}
                onGrantCashier={onGrantCashier}
              />
            ))}
          </ul>
        </>
      ) : (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          {employees.length === 0 ? (
            <Users className="mb-4 size-9 text-slate-300" aria-hidden="true" />
          ) : (
            <SearchX
              className="mb-4 size-9 text-slate-300"
              aria-hidden="true"
            />
          )}
          <h3 className="text-sm font-semibold text-slate-800">
            {employees.length === 0
              ? "Багийн анхны ажилтнаа нэмээрэй"
              : "Тохирох ажилтан олдсонгүй"}
          </h3>
          <p className="mb-5 mt-2 max-w-sm text-xs leading-5 text-slate-500">
            {employees.length === 0
              ? "MGL Store-д бүртгэлтэй хүнийг хайж, дэлгүүрийн кассын эрх олгоно."
              : "Хайлтын үгээ өөрчлөх эсвэл төлөвийн шүүлтүүрээ цэвэрлээд дахин үзээрэй."}
          </p>
          <EmployeeButton
            variant="secondary"
            onClick={
              employees.length === 0
                ? onAdd
                : () => {
                    setQuery("");
                    setFilter("ALL");
                  }
            }
          >
            {employees.length === 0 ? "Ажилтан нэмэх" : "Шүүлтүүр цэвэрлэх"}
          </EmployeeButton>
        </div>
      )}
      {!loading && employees.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3.5 text-xs text-slate-500 sm:px-6">
          <p role="status">
            Нийт {employees.length} бүртгэлээс {visible.length} харагдаж байна
          </p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck
              className="size-3.5 text-slate-400"
              aria-hidden="true"
            />
            Эрхийг зөвхөн эзэмшигч удирдана
          </p>
        </div>
      )}
    </section>
  );
}
