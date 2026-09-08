import { Clock3, Timer, UserCheck, Users } from "lucide-react";
import { AttendanceReport } from "@/lib/workforce-api";

export default function AttendanceSummaryCards({
  summary,
}: {
  summary: AttendanceReport["summary"];
}) {
  const cards = [
    { label: "Бүртгэл", value: summary.records, icon: Clock3 },
    { label: "Ажилтан", value: summary.employees, icon: Users },
    { label: "Ажиллаж байна", value: summary.openSessions, icon: UserCheck },
    {
      label: "Нийт цаг",
      value: `${Math.floor(summary.totalMinutes / 60)}ц`,
      icon: Timer,
    },
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <article
          key={label}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <Icon className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
        </article>
      ))}
    </section>
  );
}
