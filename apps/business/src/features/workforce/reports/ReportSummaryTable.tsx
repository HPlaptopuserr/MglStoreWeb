import type { WorkforceEmployeeReport } from "@mgl/types";
import { Avatar, minutes } from "../components/shared";
export function ReportSummaryTable({
  rows,
  onEmployee,
}: {
  rows: WorkforceEmployeeReport[];
  onEmployee: (userId: string) => void;
}) {
  return (
    <div className="wf-table-wrap">
      <table>
        <thead>
          <tr>
            {[
              "Ажилтан",
              "Бүртгэлтэй өдөр",
              "Хоцорсон өдөр",
              "Тасалсан өдөр",
              "Ажиллах цаг",
              "Ажилласан",
              "Хоцролт",
              "Эрт явалт",
              "Тасалсан цаг",
              "Батлагдсан илүү цаг",
            ].map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.userId}>
              <td>
                <button
                  className="wf-report-employee"
                  onClick={() => onEmployee(row.userId)}
                >
                  <Avatar name={row.employeeName} />
                  <span>
                    <strong>{row.employeeName}</strong>
                    <small>{row.department || "Хэлтэсгүй"}</small>
                  </span>
                </button>
              </td>
              <td>{row.recordedDays}</td>
              <td>{row.lateDays}</td>
              <td>{row.absentDays}</td>
              <td>{minutes(row.plannedMinutes)}</td>
              <td>{minutes(row.workedMinutes)}</td>
              <td>{minutes(row.lateMinutes)}</td>
              <td>{minutes(row.earlyMinutes)}</td>
              <td>{minutes(row.absentMinutes)}</td>
              <td>{minutes(row.approvedOvertimeMinutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
