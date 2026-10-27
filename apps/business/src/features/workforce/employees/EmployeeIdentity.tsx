import { Building2, ChevronRight } from "lucide-react";
import type { WorkforceEmployee } from "@mgl/types";
import { EmployeeAvatar } from "./EmployeeAvatar";
import { EmployeeStatus } from "./EmployeeStatus";
export function EmployeeIdentity({
  employee,
  organizationName,
  jobTitle,
}: {
  employee: WorkforceEmployee;
  organizationName: string;
  jobTitle: string | undefined;
}) {
  return (
    <>
      <div className="wf-employee-profile-hero">
        <EmployeeAvatar
          key={employee.avatarUrl}
          name={employee.name}
          src={employee.avatarUrl}
          large
        />
        <div>
          <h3>{employee.name}</h3>
          <p>{jobTitle || "Албан тушаал бүртгээгүй"}</p>
          <div className="wf-profile-meta">
            <EmployeeStatus employee={employee} />
            {employee.employeeCode && (
              <span className="wf-profile-code">#{employee.employeeCode}</span>
            )}
          </div>
        </div>
      </div>
      <div className="wf-employee-company">
        <span className="wf-profile-company-icon">
          <Building2 size={21} aria-hidden="true" />
        </span>
        <div>
          <small>Ажилладаг байгууллага</small>
          <strong>{organizationName}</strong>
        </div>
        <ChevronRight
          size={14}
          className="wf-profile-company-divider"
          aria-hidden="true"
        />
        <span className="wf-profile-department">
          {employee.department || "Хэлтэсгүй"}
        </span>
      </div>
    </>
  );
}
