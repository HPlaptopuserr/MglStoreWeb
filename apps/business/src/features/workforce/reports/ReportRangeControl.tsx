import { reportPeriodRange } from "./report-period";
import type { WorkforceRange } from "../hooks/useWorkforce";
interface ReportRangeControlProps {
  range: WorkforceRange;
  today: string;
  onChange: (range: WorkforceRange) => void;
}
export function ReportRangeControl({
  range,
  today,
  onChange,
}: ReportRangeControlProps) {
  function preset(value: string) {
    if (value === "month" || value === "week" || value === "today")
      onChange(reportPeriodRange(value, today));
  }
  return (
    <div className="wf-report-range">
      <label>
        Хугацаа
        <select
          aria-label="Хугацааны сонголт"
          value="custom"
          onChange={(event) => preset(event.target.value)}
        >
          <option value="custom">Хугацаа сонгох</option>
          <option value="month">Энэ сар</option>
          <option value="week">Сүүлийн 7 хоног</option>
          <option value="today">Өнөөдөр</option>
        </select>
      </label>
      <label>
        Эхлэх
        <input
          aria-label="Тайлан эхлэх огноо"
          type="date"
          value={range.from}
          max={range.to}
          onChange={(event) =>
            event.target.value &&
            onChange({ ...range, from: event.target.value })
          }
        />
      </label>
      <span aria-hidden="true">—</span>
      <label>
        Дуусах
        <input
          aria-label="Тайлан дуусах огноо"
          type="date"
          value={range.to}
          min={range.from}
          onChange={(event) =>
            event.target.value && onChange({ ...range, to: event.target.value })
          }
        />
      </label>
    </div>
  );
}
