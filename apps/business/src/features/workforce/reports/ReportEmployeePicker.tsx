import type { WorkforceEmployee } from "@mgl/types";
import { Users, ChevronRight } from "lucide-react";
import { Avatar, Empty } from "../components/shared";
interface ReportEmployeePickerProps {
  employees: WorkforceEmployee[];
  query: string;
  department: string;
  onSelect: (userId: string) => void;
}
export function ReportEmployeePicker({
  employees,
  query,
  department,
  onSelect,
}: ReportEmployeePickerProps) {
  const normalized = query.trim().toLocaleLowerCase();
  const visible = employees.filter(
    (employee) =>
      (!department || employee.department === department) &&
      (!normalized || employee.name.toLocaleLowerCase().includes(normalized)),
  );
  if (!visible.length)
    return (
      <Empty
        title="Ажилтан олдсонгүй"
        description={
          employees.length
            ? "Хайлт, хэлтсийн шүүлтүүрээ өөрчилнө үү."
            : "Энэ байгууллагад харах эрхтэй ажилтны бүртгэл алга."
        }
      />
    );
  return (
    <section
      className="wf-report-picker"
      aria-label="Тайлан харах ажилтнаа сонгох"
    >
      <div className="wf-report-picker-heading">
        <Users size={20} aria-hidden="true" />
        <div>
          <h3>Тайлан харах ажилтнаа сонгоно уу</h3>
          <p>
            {visible.length} ажилтан · Нэр дээр дарж дэлгэрэнгүй тайланг нээнэ.
          </p>
        </div>
      </div>
      <div className="wf-report-employee-grid">
        {visible.map((employee) => (
          <button
            key={employee.userId}
            className="wf-report-picker-card"
            onClick={() => onSelect(employee.userId)}
          >
            <Avatar name={employee.name} />
            <span>
              <strong>{employee.name}</strong>
              <small>
                {employee.department || "Хэлтэсгүй"}
                {!employee.active ? " · Идэвхгүй" : ""}
              </small>
            </span>
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
