import { workforceStatusLabels, type WorkforceSnapshot } from "@mgl/types";
export interface ReportFilterState {
  employee: string;
  department: string;
  status: string;
  query: string;
}
export const emptyReportFilters: ReportFilterState = {
  employee: "",
  department: "",
  status: "",
  query: "",
};
export function ReportFilters({
  data,
  value,
  onChange,
}: {
  data: WorkforceSnapshot;
  value: ReportFilterState;
  onChange: (next: ReportFilterState) => void;
}) {
  return (
    <div className="wf-filters">
      <input
        aria-label="Нэрээр хайх"
        placeholder="Ажилтны нэрээр хайх…"
        value={value.query}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
      />
      <select
        aria-label="Тайлангийн ажилтан"
        value={value.employee}
        onChange={(e) => onChange({ ...value, employee: e.target.value })}
      >
        <option value="">Ажилтан сонгох / Бүгд</option>
        {data.employees.map((employee) => (
          <option key={employee.userId} value={employee.userId}>
            {employee.name}
            {!employee.active ? " · Идэвхгүй" : ""}
          </option>
        ))}
      </select>
      <select
        aria-label="Тайлангийн хэлтэс"
        value={value.department}
        onChange={(e) => onChange({ ...value, department: e.target.value })}
      >
        <option value="">Бүх хэлтэс</option>
        {data.departments.map((department) => (
          <option key={department.id} value={department.name}>
            {department.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Ирцийн төлөв"
        value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value })}
      >
        <option value="">Бүх төлөв</option>
        {Object.entries(workforceStatusLabels).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      <button onClick={() => onChange(emptyReportFilters)}>Цэвэрлэх</button>
    </div>
  );
}
