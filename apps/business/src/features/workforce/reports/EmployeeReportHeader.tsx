import type { WorkforceEmployee } from "@mgl/types";
import { ArrowLeftRight, X } from "lucide-react";
import { Avatar } from "../components/shared";
export function EmployeeReportHeader({
  employee,
  onChange,
  onClear,
}: {
  employee: WorkforceEmployee;
  onChange: () => void;
  onClear: () => void;
}) {
  return (
    <div className="wf-selected-employee">
      <Avatar name={employee.name} />
      <div>
        <small>СОНГОСОН АЖИЛТАН</small>
        <strong>{employee.name}</strong>
        <span>{employee.department || "Хэлтэсгүй"}</span>
      </div>
      <div className="wf-selected-employee-actions">
        <button onClick={onChange}>
          <ArrowLeftRight size={15} />
          Ажилтан солих
        </button>
        <button onClick={onClear} aria-label="Ажилтны сонголт цэвэрлэх">
          <X size={17} />
        </button>
      </div>
    </div>
  );
}
