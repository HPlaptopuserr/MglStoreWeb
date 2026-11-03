import type { WorkforceEmployee } from "@mgl/types";
export function EmployeeStatus({
  employee,
}: {
  employee: Pick<WorkforceEmployee, "active" | "employmentEndedAt">;
}) {
  const label = employee.employmentEndedAt
    ? "Ажлаас гарсан"
    : employee.active
      ? "Идэвхтэй"
      : "Идэвхгүй";
  return (
    <span
      className={`wf-badge ${employee.active && !employee.employmentEndedAt ? "wf-request-approved" : ""}`}
    >
      {label}
    </span>
  );
}
