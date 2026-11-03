import type { ReactNode } from "react";
import type { WorkforceEmployeeProfile } from "@mgl/types";
interface DetailItem {
  label: string;
  value?: ReactNode;
}
export function EmployeeDetailSection({
  title,
  items,
}: {
  title: string;
  items: DetailItem[];
}) {
  return (
    <section className="wf-employee-section wf-profile-section">
      <h3>{title}</h3>
      <dl className="wf-employee-detail-grid">
        {items.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>
              {item.value || <span className="wf-muted">Бүртгээгүй</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export function employeeDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(+date)
    ? date.toISOString().slice(0, 10).replace(/-/g, ".")
    : "";
}
export function EmployeePrivateDetails({
  profile,
}: {
  profile: WorkforceEmployeeProfile;
}) {
  const gender = { MALE: "Эрэгтэй", FEMALE: "Эмэгтэй", OTHER: "Бусад", "": "" }[
    profile.gender
  ];
  return (
    <>
      <EmployeeDetailSection
        title="Хувийн мэдээлэл"
        items={[
          { label: "Овог", value: profile.lastName },
          { label: "Нэр", value: profile.fullName },
          { label: "Регистрийн дугаар", value: profile.registerNumber },
          { label: "Төрсөн огноо", value: employeeDate(profile.birthDate) },
          { label: "Хүйс", value: gender },
          { label: "Гэрийн хаяг", value: profile.address },
        ]}
      />
      {profile.notes && (
        <section className="wf-employee-section wf-profile-section">
          <h3>Нэмэлт мэдээлэл</h3>
          <p className="wf-employee-notes">{profile.notes}</p>
        </section>
      )}
    </>
  );
}

export function EmployeeEmergencyDetails({
  profile,
}: {
  profile: WorkforceEmployeeProfile;
}) {
  return (
    <EmployeeDetailSection
      title="Яаралтай үед холбоо барих"
      items={[
        {
          label: "Холбоо барих хүн, хамаарал",
          value: profile.emergencyContactName,
        },
        { label: "Утасны дугаар", value: profile.emergencyContactPhone },
      ]}
    />
  );
}
