import type { WorkforceEmployee } from "@mgl/types";
import { ArrowRight, UsersRound } from "lucide-react";
import { Avatar } from "../components/shared";
export function EmployeeReportEntry({
  employees,
  onChoose,
  onSelect,
}: {
  employees: WorkforceEmployee[];
  onChoose: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <section
      className="wf-report-entry"
      aria-labelledby="employee-report-entry-title"
    >
      <div className="wf-report-entry-icon">
        <UsersRound size={30} aria-hidden="true" />
      </div>
      <p className="wf-kicker">АЖИЛТНЫ ЦАГИЙН ТАЙЛАН</p>
      <h2 id="employee-report-entry-title">Хэний тайланг харах вэ?</h2>
      <p>
        Ажилтнаа сонгоод ирц, ажилласан цаг болон өдрийн дэлгэрэнгүйг нэг дор
        хараарай.
      </p>
      <button className="wf-primary" onClick={onChoose}>
        Ажилтан сонгох <ArrowRight size={17} aria-hidden="true" />
      </button>
      <div
        className="wf-report-entry-people"
        aria-label="Ажилтны хурдан сонголт"
      >
        {employees.slice(0, 4).map((employee) => (
          <button
            key={employee.userId}
            onClick={() => onSelect(employee.userId)}
          >
            <Avatar name={employee.name} />
            <span>{employee.name}</span>
          </button>
        ))}
      </div>
      <small>
        {employees.length
          ? `${employees.length} ажилтан · Нэр, хэлтсээр хайж сонгох боломжтой`
          : "Энэ байгууллагад харах эрхтэй ажилтан алга."}
      </small>
    </section>
  );
}
