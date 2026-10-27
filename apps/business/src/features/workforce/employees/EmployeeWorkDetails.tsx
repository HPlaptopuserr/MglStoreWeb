import type { WorkforceEmployee, WorkforceEmployeeProfile } from "@mgl/types";
import { EmployeeDetailSection, employeeDate } from "./EmployeeDetailSections";
export function EmployeeWorkDetails({
  employee,
  profile,
}: {
  employee: WorkforceEmployee;
  profile?: WorkforceEmployeeProfile;
}) {
  return (
    <>
      <EmployeeDetailSection
        title="Ажлын мэдээлэл"
        items={[
          {
            label: "Албан тушаал",
            value: profile?.jobTitle || employee.jobTitle,
          },
          { label: "Алба, хэлтэс", value: employee.department },
          {
            label: "Ажилтны код",
            value: profile?.employeeCode || employee.employeeCode,
          },
          ...(profile
            ? [
                {
                  label: "Ажилд орсон огноо",
                  value: employeeDate(profile.hiredAt),
                },
              ]
            : []),
          {
            label: "Системд элссэн огноо",
            value: employeeDate(employee.joinedAt),
          },
          { label: "Бүртгэлийн эрх", value: employee.role },
        ]}
      />
      {employee.employmentEndedAt && (
        <EmployeeDetailSection
          title="Ажлаас гарсан мэдээлэл"
          items={[
            {
              label: "Сүүлийн өдөр",
              value: employeeDate(employee.employmentEndedAt),
            },
            { label: "Шалтгаан", value: employee.employmentEndReason },
          ]}
        />
      )}
    </>
  );
}
