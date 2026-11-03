import type { WorkforceRow } from "@mgl/types";
import { Avatar, StatusBadge, minutes, time } from "../components/shared";
export function ReportDetailTable({
  rows,
  timeZone,
  onManual,
  employeeView,
}: {
  rows: WorkforceRow[];
  timeZone: string;
  employeeView: boolean;
  onManual?: (row: WorkforceRow) => void;
}) {
  return (
    <div className="wf-table-wrap">
      <table>
        <thead>
          <tr>
            {[
              "Огноо",
              ...(!employeeView ? ["Ажилтан"] : []),
              "Ирцийн төлөв",
              "Хуваарь",
              "Ирсэн",
              "Явсан",
              "Ажиллах цаг",
              "Ажилласан",
              "Хоцролт",
              "Эрт явалт",
              ...(onManual ? ["Үйлдэл"] : []),
            ].map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.date}</td>
              {!employeeView && (
                <td>
                  <div className="wf-employee-cell">
                    <Avatar name={row.employeeName} />
                    <div>
                      <strong>{row.employeeName}</strong>
                      <small>{row.department || "Хэлтэсгүй"}</small>
                    </div>
                  </div>
                </td>
              )}
              <td>
                <StatusBadge status={row.status} />
              </td>
              <td>
                {row.scheduledStart
                  ? `${time(row.scheduledStart, timeZone)}–${time(row.scheduledEnd, timeZone)}`
                  : "—"}
                <small>{row.shiftName}</small>
              </td>
              <td>{time(row.clockIn, timeZone)}</td>
              <td>{time(row.clockOut, timeZone)}</td>
              <td>{minutes(row.plannedMinutes)}</td>
              <td>{row.clockIn ? minutes(row.workedMinutes) : "—"}</td>
              <td className={row.lateMinutes ? "wf-red" : ""}>
                {minutes(row.lateMinutes)}
              </td>
              <td>{minutes(row.earlyMinutes)}</td>
              {onManual && (
                <td>
                  <button
                    type="button"
                    onClick={() => onManual(row)}
                    aria-label={`${row.employeeName}, ${row.date}: гараар цаг бүртгэх`}
                  >
                    Цаг бүртгэх
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
