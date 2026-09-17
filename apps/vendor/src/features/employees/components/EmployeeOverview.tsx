import { Monitor, UserCheck, Users } from "lucide-react";
import type { EmployeeSummary } from "../store-employee.model";

export function EmployeeOverview({
  summary,
  loading,
}: {
  summary: EmployeeSummary;
  loading: boolean;
}) {
  const stats = [
    {
      label: "Нийт багийн гишүүн",
      value: summary.total,
      detail: "Эзэмшигч болон ажилтнууд",
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Идэвхтэй эрх",
      value: summary.active,
      detail: `${summary.inactive} эрх түр хаалттай`,
      icon: UserCheck,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Кассын ажилтан",
      value: summary.cashiers,
      detail: "Идэвхтэй кассын ажилтнууд",
      icon: Monitor,
      color: "bg-violet-50 text-violet-600",
    },
  ];
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      {stats.map(({ label, value, detail, icon: Icon, color }) => (
        <div
          key={label}
          className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/20"
        >
          <div>
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {loading ? "—" : value}
            </dd>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              {loading ? "Мэдээлэл ачаалж байна" : detail}
            </p>
          </div>
          <span className={`rounded-xl p-2.5 ${color}`}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
        </div>
      ))}
    </dl>
  );
}
