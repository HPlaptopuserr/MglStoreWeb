import { Download, Printer, Plus } from "lucide-react";
import { ReportNavigation } from "./ReportNavigation";
export function ReportToolbar({
  canManage,
  canExport,
  exportQuery,
  onManual,
  selectionPending = false,
}: {
  canManage: boolean;
  canExport: boolean;
  exportQuery: URLSearchParams;
  onManual: () => void;
  selectionPending?: boolean;
}) {
  return (
    <div className="wf-toolbar">
      <ReportNavigation />
      {!selectionPending && (
        <div className="wf-actions">
          {canManage && (
            <button className="wf-primary" onClick={onManual}>
              <Plus size={16} />
              Гараар цаг бүртгэх
            </button>
          )}
          {canExport && (
            <a
              className="wf-button"
              href={`/api/workforce/export?${exportQuery}`}
            >
              <Download size={16} />
              Excel экспорт
            </a>
          )}
          <button onClick={() => window.print()}>
            <Printer size={16} />
            Хэвлэх / PDF
          </button>
        </div>
      )}
    </div>
  );
}
export function ReportDisplayControls({
  counts,
  onCounts,
  day,
  from,
  to,
  onDay,
}: {
  counts: boolean;
  onCounts: (value: boolean) => void;
  day?: string;
  from: string;
  to: string;
  onDay: (value: string) => void;
}) {
  return (
    <div className="wf-toolbar">
      <div className="wf-segment">
        <button
          className={!counts ? "active" : ""}
          aria-pressed={!counts}
          onClick={() => onCounts(false)}
        >
          Цагаар
        </button>
        <button
          className={counts ? "active" : ""}
          aria-pressed={counts}
          onClick={() => onCounts(true)}
        >
          Тоогоор
        </button>
      </div>
      {day && (
        <label className="wf-report-day">
          Тайлангийн өдөр
          <input
            type="date"
            aria-label="Тайлангийн өдөр"
            min={from}
            max={to}
            value={day}
            onChange={(event) => onDay(event.target.value)}
          />
        </label>
      )}
    </div>
  );
}
