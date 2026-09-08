import { AttendanceReportRow } from "@/lib/workforce-api";

const dateTime = new Intl.DateTimeFormat("mn-MN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function duration(minutes: number | null) {
  if (minutes == null) return "—";
  return `${Math.floor(minutes / 60)}ц ${minutes % 60}мин`;
}

export default function AttendanceReportTable({
  rows,
}: {
  rows: AttendanceReportRow[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">Ажилтан</th>
              <th className="px-5 py-4">Хэлтэс</th>
              <th className="px-5 py-4">Ирсэн</th>
              <th className="px-5 py-4">Гарсан</th>
              <th className="px-5 py-4">Ажилласан</th>
              <th className="px-5 py-4">Бүс</th>
              <th className="px-5 py-4">Төлөв</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-indigo-50/40">
                <td className="px-5 py-4">
                  <p className="font-black text-slate-900">
                    {row.employeeName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{row.email}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-700">
                  {row.department}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                  {dateTime.format(new Date(row.clockIn))}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                  {row.clockOut ? dateTime.format(new Date(row.clockOut)) : "—"}
                </td>
                <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-800">
                  {duration(row.totalMinutes)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                  {row.zone.name}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
                      row.status === "OPEN"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {row.status === "OPEN" ? "Ажиллаж байна" : "Гарсан"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
