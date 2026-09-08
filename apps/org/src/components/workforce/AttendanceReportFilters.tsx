import { Search } from "lucide-react";

export type AttendanceFilterValue = {
  from: string;
  to: string;
  search: string;
  department: string;
  status: "ALL" | "OPEN" | "CLOSED";
};

export default function AttendanceReportFilters({
  value,
  departments,
  onChange,
}: {
  value: AttendanceFilterValue;
  departments: string[];
  onChange: (value: AttendanceFilterValue) => void;
}) {
  const update = <Key extends keyof AttendanceFilterValue>(
    key: Key,
    next: AttendanceFilterValue[Key],
  ) => onChange({ ...value, [key]: next });

  return (
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(140px,auto))]">
      <label className="relative">
        <span className="sr-only">Ажилтан хайх</span>
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input
          value={value.search}
          onChange={(event) => update("search", event.target.value)}
          placeholder="Нэр, имэйлээр хайх"
          className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </label>
      <input
        aria-label="Эхлэх огноо"
        type="date"
        value={value.from}
        max={value.to}
        onChange={(event) => update("from", event.target.value)}
        className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400"
      />
      <input
        aria-label="Дуусах огноо"
        type="date"
        value={value.to}
        min={value.from}
        onChange={(event) => update("to", event.target.value)}
        className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400"
      />
      <select
        aria-label="Хэлтэс"
        value={value.department}
        onChange={(event) => update("department", event.target.value)}
        className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400"
      >
        <option value="">Бүх хэлтэс</option>
        {departments.map((department) => (
          <option key={department} value={department}>
            {department}
          </option>
        ))}
      </select>
      <select
        aria-label="Төлөв"
        value={value.status}
        onChange={(event) =>
          update(
            "status",
            event.target.value as AttendanceFilterValue["status"],
          )
        }
        className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400"
      >
        <option value="ALL">Бүх төлөв</option>
        <option value="OPEN">Ажиллаж байна</option>
        <option value="CLOSED">Гарсан</option>
      </select>
    </section>
  );
}
